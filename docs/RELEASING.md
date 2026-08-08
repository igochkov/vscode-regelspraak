# Releasing

The extension is published to the VS Code Marketplace by
[.github/workflows/release.yml](../.github/workflows/release.yml) when a
version tag is pushed.

## Versioning

Each delivered phase of the [implementation plan](https://github.com/igochkov/regelspraak-lsp)
gets a minor release, so the version says how far the capability set has come:

| Version | Phase | Headline |
|---|---|---|
| `0.1.0` | 1 | Semantic colour, diagnostics, completion, hover, outline (first public preview) |
| `0.2.0` | 2 | Navigation and cross-file rename |
| `0.3.0` | 3 | Full validation catalogue and quick fixes |
| `0.4.0` | 4 | Formatting and editor ergonomics |
| `0.5.0` | 5 | Running rules against scenario data |
| `1.0.0` | 6 | Model Explorer and workbench capabilities; GA |

Bug-fix releases take the patch position (`0.1.1`). While the extension is
`0.x`, breaking changes are allowed in a minor release; from `1.0.0` normal
semantic versioning applies.

## Cutting a release

```sh
# 1. Bump the version in package.json (and package-lock.json).
npm version 0.1.0 --no-git-tag-version

# 2. Sanity-check the artifact locally — this is the same check CI runs.
node scripts/assemble-server.mjs ../regelspraak-lsp
npm run package
npm run verify:vsix

# 3. Commit, open a PR, merge.

# 4. Tag the merge commit on main. The tag must match package.json exactly.
git tag v0.1.0
git push origin v0.1.0
```

The workflow then builds the server from `igochkov/regelspraak-lsp`, runs its
test suite, assembles and packages the `.vsix`, **verifies the packaged server
starts and returns a diagnostic**, and only then publishes and creates the
GitHub Release.

By default the server is built from `main` of the server repository. To pin a
release to a specific server revision, set the `SERVER_REF` repository
variable to a tag or SHA.

## Why the build spans two repositories

The `.vsix` needs the language server and the generated ANTLR parser, which
live in the private `regelspraak-lsp` repository. Three details make this more
than a copy, and are handled by
[scripts/assemble-server.mjs](../scripts/assemble-server.mjs):

- `vsce` does not follow directory junctions, so the link used for local
  development is invisible to packaging — the server must be copied in.
- The compiled server does `require('../../../grammar/gen/…')`, which resolves
  to `<extension>/grammar/gen`, so the generated parser ships outside
  `server/`.
- `antlr4ng` is loaded by both the server and the generated parser. Node
  resolves it by walking up from each, and the only directory on both paths is
  the extension root — hence the `antlr4ng` dependency in this repository's
  `package.json`. The assemble script fails if it drifts from the version the
  server repository uses.

`scripts/verify-vsix.mjs` exists because every one of those can produce a
`.vsix` that builds successfully and still contains a server that cannot load.
It unpacks the built artifact and completes a real LSP session against it.

## One-time setup

### Marketplace publishing (Entra ID via GitHub OIDC)

Publishing uses a federated credential rather than a stored token — Azure
DevOps global PATs are retired on 2026-12-01.

1. Create an app registration in Microsoft Entra ID.
2. Add a federated credential of type **GitHub Actions deploying Azure
   resources**, scoped to this repository and the **`release` environment**
   (the workflow declares `environment: release`, and the credential's subject
   must match `repo:igochkov/vscode-regelspraak:environment:release`).
3. In the [Marketplace publisher management page](https://marketplace.visualstudio.com/manage),
   add that identity as a member of the `igochkov` publisher.
4. Add repository secrets `AZURE_CLIENT_ID` and `AZURE_TENANT_ID`.
5. Create the `release` environment in repository settings. Adding a required
   reviewer here is worthwhile: it makes publishing a deliberate act.

### Access to the server repository

Add a repository secret `SERVER_REPO_TOKEN` — a fine-grained personal access
token, or a GitHub App installation token, with **read** access to contents of
`igochkov/regelspraak-lsp`.

CI uses the same secret to package a preview `.vsix` on pushes and internal
pull requests. Forked pull requests cannot see it; that job is skipped rather
than failed, so external contributors still get a green build.

### Open VSX (optional)

Add an `OVSX_PAT` secret to also publish to [Open VSX](https://open-vsx.org),
which is what VSCodium and several other editors install from. The step is
skipped when the secret is absent.
