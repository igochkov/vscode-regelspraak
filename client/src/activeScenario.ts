// X2b — which testgeval a run is made against, and saying so.
//
// A *testgeval* rather than a testset, because a testgeval is what composes into
// runnable input: a testset is several of them, and "run this rule against the
// active scenario" needs one situation, not a choice of them.
//
// Two layers, as decided (FSD §X2). `regelspraak.execution.defaultScenario` is
// the committable default — a team shares the scenario its model is usually
// demonstrated against, in a file under review like anything else — and a Quick
// Pick overrides it for the window, in `workspaceState`. Overriding never edits
// the setting, so a local choice is not a diff.
//
// **The status item is load-bearing, not decoration.** The risk this design
// carries is a run silently using a scenario chosen days ago, and the mitigation
// is that it is never invisible. A language status item for C7's reason: it
// appears beside a `.rgs` file rather than in every window, and the active
// scenario is meaningless anywhere else.

import {
	Disposable, ExtensionContext, LanguageStatusItem, QuickPickItem, Uri,
	languages, window, workspace
} from 'vscode';

import { TestExplorer } from './testExplorer';

export const CHOOSE_SCENARIO_COMMAND = 'regelspraak.kiesTestgeval';

/** Exported so `extension.ts` can watch it without holding a second copy. */
export const SCENARIO_SETTING = 'regelspraak.execution.defaultScenario';
const MEMORY_KEY = 'regelspraak.activeScenario';

/** A chosen testgeval: which document, and which case in it. */
export interface Scenario {
	uri: string;
	case: string;
}

/**
 * `<pad>#<naam>` — the path relative to the first workspace folder.
 *
 * The form `regelspraak.server.path` already uses for a path, and the separator
 * W7's `TestItem` ids already use. One format for "which testgeval", not two.
 */
function parse(value: string): Scenario | undefined {
	const at = value.lastIndexOf('#');
	if (at <= 0) {
		return undefined;
	}
	const [folder] = workspace.workspaceFolders ?? [];
	if (!folder) {
		return undefined;
	}
	return {
		uri: Uri.joinPath(folder.uri, value.slice(0, at)).toString(),
		case: value.slice(at + 1)
	};
}

function unparse(scenario: Scenario): string {
	const [folder] = workspace.workspaceFolders ?? [];
	const path = Uri.parse(scenario.uri).path;
	const base = folder ? folder.uri.path : '';
	const relative = base && path.startsWith(`${base}/`) ? path.slice(base.length + 1) : path;
	return `${relative}#${scenario.case}`;
}

export class ActiveScenario implements Disposable {
	private readonly item: LanguageStatusItem;
	private chosen: Scenario | undefined;

	constructor(
		private readonly context: ExtensionContext,
		private readonly explorer: TestExplorer
	) {
		this.chosen = context.workspaceState.get<Scenario>(MEMORY_KEY);
		this.item = languages.createLanguageStatusItem(
			'regelspraak.activeScenario', { language: 'regelspraak' });
		this.item.command = {
			command: CHOOSE_SCENARIO_COMMAND,
			title: 'Kiezen…'
		};
		this.refresh();
	}

	/** The window's choice, else the setting, else nothing. */
	get current(): Scenario | undefined {
		if (this.chosen) {
			return this.chosen;
		}
		const configured = workspace.getConfiguration().get<string>(SCENARIO_SETTING)?.trim();
		return configured ? parse(configured) : undefined;
	}

	/**
	 * The current scenario, asking for one where none is set.
	 *
	 * Asking rather than refusing: a run command with nothing chosen is a person
	 * who wants to run something, and the next thing they need is the list.
	 */
	async require(): Promise<Scenario | undefined> {
		return this.current ?? await this.choose();
	}

	/** The Quick Pick (C5), over the testgevallen the server has discovered. */
	async choose(): Promise<Scenario | undefined> {
		await this.explorer.refresh();
		interface Pick extends QuickPickItem { scenario: Scenario }
		const items: Pick[] = this.explorer.allCases().map(one => ({
			label: one.case,
			description: shortName(one.uri),
			scenario: one
		}));
		if (items.length === 0) {
			void window.showInformationMessage(
				'Er zijn geen testgevallen gevonden. Schrijf er een in een *.test.rgs-bestand.');
			return undefined;
		}
		const picked = await window.showQuickPick(items, {
			title: 'Actief testgeval',
			placeHolder: 'Waartegen moet een regel uitgevoerd worden?'
		});
		if (!picked) {
			return undefined;
		}
		this.chosen = picked.scenario;
		await this.context.workspaceState.update(MEMORY_KEY, picked.scenario);
		this.refresh();
		return picked.scenario;
	}

	/**
	 * Redraws the item, and is called on every change to the setting as well.
	 *
	 * Both layers show the same way but not the same words: which one is in force
	 * is the fact a reader is missing, and "from the setting" versus "chosen here"
	 * is the difference between a shared default and something they did.
	 */
	refresh(): void {
		const { text, detail } = statusFor(this.current, this.chosen !== undefined);
		this.item.text = text;
		this.item.detail = detail;
	}

	dispose(): void {
		this.item.dispose();
	}
}

/** The setting's value for a scenario, for anyone writing one by hand. */
export function settingValue(scenario: Scenario): string {
	return unparse(scenario);
}

/**
 * What the status item says, as a function of the two facts that decide it.
 *
 * Separated from the item for the reason W4's `rangeOfGesture` was: a workbench
 * surface cannot be driven from a test, so the half that decides anything lives
 * where a test reaches it. And there *is* a decision here — which of the two
 * layers is in force is precisely the fact a reader is missing, and "chosen here"
 * versus "from the setting" is the difference between something a colleague
 * committed and something they did themselves five minutes ago.
 */
export function statusFor(
	scenario: Scenario | undefined,
	chosenHere: boolean
): { text: string; detail: string } {
	if (!scenario) {
		return {
			text: 'RegelSpraak: geen actief testgeval',
			detail: 'Kies er een om een regel tegen uit te voeren.'
		};
	}
	return {
		text: `RegelSpraak: ${scenario.case}`,
		detail: chosenHere
			? `Gekozen in dit venster · ${shortName(scenario.uri)}`
			: `Uit de instelling · ${shortName(scenario.uri)}`
	};
}

function shortName(uri: string): string {
	return Uri.parse(uri).path.split('/').pop() ?? uri;
}
