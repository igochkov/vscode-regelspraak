# vscode-regelspraak

RegelSpraak language support for Visual Studio Code.

[RegelSpraak](https://regelspraak.nl/) is the controlled natural language the Dutch Tax and Customs Administration (Belastingdienst) uses to specify legislation as executable rules. Further material is published on the [Wendbare wetsuitvoering](https://wendbarewetsuitvoering.pleio.nl/page/view/ba938b8f-0668-4451-a7e6-81de78bbe66a/regelspraak) community pages.

This extension provides editor support for `.rgs` files. The extension is `.rgs` rather than the more obvious `.rs`, because `.rs` is already established for Rust source files.

## Features

- Syntax highlighting for `.rgs` files via a TextMate grammar.
- A language client that starts the RegelSpraak language server and speaks the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) with it.

Language features (diagnostics, completion, hover, and so on) are provided by the language server as they land.

## Architecture

The extension is split in two:

| Part | Where it lives | License |
| --- | --- | --- |
| Extension client — activation, LSP wiring, TextMate grammar, language configuration | this repository | Apache-2.0 |
| RegelSpraak language server — parser and language analysis | separate, private repository | proprietary |

The language server runs **locally** as a child process of the extension, communicating over Node IPC. Nothing is sent to a network service, and your `.rgs` files never leave your machine. Released `.vsix` packages bundle a compiled build of the server; that build is proprietary and licensed for use only as part of this extension.

## Building the client

```
npm install
npm run compile
```

`npm run watch` recompiles on change. `npm run lint` runs ESLint.

## Pointing the extension at a language server

This repository contains no language server of its own, so running it requires a server build. The client resolves one in this order:

1. The `regelspraak.server.path` setting, if set — absolute, or relative to the first workspace folder.
2. `server/out/server.js` inside the extension folder, which is where released `.vsix` packages carry the bundled server.

If neither exists the extension reports the path it tried and which of the two produced it, rather than failing silently. Changing the setting restarts the server; no window reload needed.

For development, either set the path to your server build:

```jsonc
{
	"regelspraak.server.path": "D:\\path\\to\\regelspraak-language-server\\server\\out\\server.js"
}
```

...or place the build where the bundled server would go, which needs no configuration at all. `.gitignore` reserves `server/` for exactly this, so the link can never be committed:

```
# Windows
mklink /J server ..\regelspraak-language-server\server
# macOS / Linux
ln -s ../regelspraak-language-server/server server
```

Note that the setting has to be readable by the window running the extension. When debugging, that is the Extension Development Host — so set it in your User settings, or in the settings of whichever folder you open inside that window, not in the settings of the window you press F5 from.

## Debugging

- Press `Ctrl+Shift+B` to start the TypeScript compiler in watch mode.
- Switch to the Run and Debug view (`Ctrl+Shift+D`) and pick `Launch Client`.
- Press F5 to open an [Extension Development Host](https://code.visualstudio.com/api/get-started/your-first-extension) window.
- Open any `.rgs` file and check the "RegelSpraak Language Server" output channel to confirm the server started.

## Syntax highlighting

[syntaxes/regelspraak.tmLanguage.json](syntaxes/regelspraak.tmLanguage.json) is **generated** from the authoritative ANTLR lexer — do not edit it by hand. Generation happens in the language server repository so the highlighter stays in sync with the language definition; the generated file is committed here because the extension needs it at runtime.

## License and third-party notices

This repository's own source is licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for what that does **not** cover:

- The bundled language server in released extensions is proprietary and is licensed for use only as part of this extension.
- The RegelSpraak specification is © 2025 Belastingdienst and is not redistributed here.
