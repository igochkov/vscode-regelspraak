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

To run the extension you also need a build of the language server. The client currently resolves it at `server/out/server.js` relative to the extension root — the path `.gitignore` reserves for a server build dropped in at packaging time. A user-configurable server path is the next planned change, so that this repository can be built and debugged against any LSP-compatible server build.

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
