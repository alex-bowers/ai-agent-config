#!/bin/sh

set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TMP=$(mktemp -d "${TMPDIR:-/tmp}/agent-config-test.XXXXXX")
mkdir -p "$TMP/home"

run() { HOME="$TMP/home" AGENT_CONFIG_HOME="$ROOT" "$ROOT/bin/agent-config" "$@"; }

run install --vendor codex >/dev/null
test -L "$TMP/home/.codex/skills/example"
test "$(readlink "$TMP/home/.codex/skills/example")" = "$ROOT/agents/skills/example"
test -L "$TMP/home/.codex/AGENTS.md"

run install --vendor codex >/dev/null
run doctor --vendor codex >/dev/null

rm "$TMP/home/.codex/AGENTS.md"
mkdir "$TMP/home/.codex/AGENTS.md"
if run install --vendor codex >/dev/null 2>&1; then
  echo "expected install to reject a conflicting directory" >&2
  exit 1
fi
run install --vendor codex --force >/dev/null
run doctor --vendor codex >/dev/null

rm "$TMP/home/.codex/skills/example"
if run doctor --vendor codex >/dev/null 2>&1; then
  echo "expected doctor to detect a missing symlink" >&2
  exit 1
fi

echo "agent-config tests passed"
