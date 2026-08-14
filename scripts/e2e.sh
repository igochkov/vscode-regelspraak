#!/usr/bin/env bash

# Run from an integrated terminal, this script inherits the host VS Code's own
# Electron environment. ELECTRON_RUN_AS_NODE=1 in particular makes the VS Code
# we launch behave as plain Node, which then tries to execute the workspace
# folder as a script and fails with MODULE_NOT_FOUND. None of it belongs to the
# child.
unset ELECTRON_RUN_AS_NODE
for name in $(env | sed -n 's/^\(VSCODE_[A-Za-z0-9_]*\)=.*/\1/p'); do
	unset "$name"
done

export CODE_TESTS_PATH="$(pwd)/client/out/test"
export CODE_TESTS_WORKSPACE="$(pwd)/client/testFixture"

node "$(pwd)/client/out/test/runTest"
