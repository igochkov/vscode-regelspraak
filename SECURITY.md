# Security

## Reporting a vulnerability

Please report privately rather than opening a public issue:

- Use [GitHub's private vulnerability reporting](https://github.com/igochkov/vscode-regelspraak/security/advisories/new) for this repository, or
- email the address on the [maintainer's GitHub profile](https://github.com/igochkov).

Include what you did, what happened, and the extension version. A proof of
concept helps but is not required to file.

This is a small project maintained by one person, so no response-time
guarantee is offered. Reports are looked at as soon as reasonably possible,
and you will get an acknowledgement even if the answer is "this is working as
intended".

## Supported versions

Only the latest version published to the Marketplace receives fixes. During
the `0.x` series, fixes ship in the next minor release rather than as patches
to older ones.

## What this extension does with your code

Worth stating plainly, because it answers most of the questions people
actually have:

- The language server runs **locally**, as a child process of the extension,
  communicating over Node IPC. Your `.rgs` files are read from disk and
  analysed in that process.
- **Nothing is sent to any network service.** The extension makes no outbound
  requests: no telemetry, no analytics, no model or completion service, no
  license check.
- The extension reads every `.rgs` file in the open workspace in order to
  build its cross-file model. It does not read files of other types, and it
  writes nothing outside what you explicitly edit.
- It activates only when a workspace contains a `.rgs` file.

## Trust boundary

Opening a folder in VS Code and letting an extension analyse it is the normal
trust model here: a `.rgs` file is data to the parser, not something that gets
executed. The extension does not evaluate RegelSpraak, shell out, or load code
from the workspace.

If that changes — the roadmap includes running rules against scenario data —
it will run in a constrained process, and this document will be updated before
that ships.

## Third-party components

Released `.vsix` packages bundle the RegelSpraak language server, which is
proprietary and built from a separate private repository (see
[NOTICE](NOTICE)). Vulnerabilities in it are reported the same way and fixed
in the same release cycle.
