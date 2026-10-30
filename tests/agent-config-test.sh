#!/bin/sh

set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TMP=$(mktemp -d "${TMPDIR:-/tmp}/agent-config-test.XXXXXX")
mkdir -p "$TMP/home"
SKILL=cloudflare-one-migrations
SOURCES_FILE="$TMP/sources.txt"
SKILL_PATH="agents/skills/$SKILL"
UPSTREAM="$TMP/upstream"

fixture_revision=
for revision in $(git -C "$ROOT" rev-list --all -- "$SKILL_PATH/SKILL.md"); do
  if git -C "$ROOT" cat-file -e "$revision:$SKILL_PATH/SKILL.md" 2>/dev/null; then
    fixture_revision=$revision
    break
  fi
done
test -n "$fixture_revision"
git clone --quiet --no-checkout "$ROOT" "$UPSTREAM"
git -C "$UPSTREAM" branch fixture "$fixture_revision"
printf '%s|%s|fixture|%s\n' "$SKILL" "$UPSTREAM" "$SKILL_PATH" > "$SOURCES_FILE"

run() {
  HOME="$TMP/home" AGENT_CONFIG_HOME="$ROOT" \
    AGENT_CONFIG_CACHE_DIR="$TMP/cache" SKILL_SOURCES_FILE="$SOURCES_FILE" \
    "$ROOT/bin/agent-config" "$@"
}

if run install --vendor codex >/dev/null 2>&1; then
  echo "expected install to require a fetch when no local skill exists" >&2
  exit 1
fi
run fetch >/dev/null
run install --vendor codex >/dev/null
test -L "$TMP/home/.codex/skills/$SKILL"
case "$(readlink "$TMP/home/.codex/skills/$SKILL")" in
  "$TMP/cache/releases/"*/"$SKILL") ;;
  *) echo "expected install to link the fetched skill" >&2; exit 1 ;;
esac
test -L "$TMP/home/.codex/AGENTS.md"

run install --vendor codex >/dev/null
run doctor --vendor codex >/dev/null

run fetch >/dev/null
test -f "$TMP/cache/current"
test -s "$TMP/cache/releases/$(cat "$TMP/cache/current")/.sources"
if run doctor --vendor codex >/dev/null 2>&1; then
  echo "expected doctor to detect a link to the old source" >&2
  exit 1
fi
run sync --vendor codex >/dev/null
case "$(readlink "$TMP/home/.codex/skills/$SKILL")" in
  "$TMP/cache/releases/"*/"$SKILL") ;;
  *) echo "expected sync to link the fetched skill" >&2; exit 1 ;;
esac
run doctor --vendor codex >/dev/null

ln -s "$ROOT/agents/skills/removed-skill" "$TMP/home/.codex/skills/removed-skill"
mkdir "$TMP/home/.codex/skills/unrelated-skill"
if run doctor --vendor codex >/dev/null 2>"$TMP/doctor.err"; then
  echo "expected doctor to detect an obsolete managed symlink" >&2
  exit 1
fi
grep -q 'obsolete managed symlink' "$TMP/doctor.err"
run sync --vendor codex --dry-run >/dev/null
test -L "$TMP/home/.codex/skills/removed-skill"
run sync --vendor codex >/dev/null
test ! -L "$TMP/home/.codex/skills/removed-skill"
test -d "$TMP/home/.codex/skills/unrelated-skill"
run doctor --vendor codex >/dev/null

first_release=$(cat "$TMP/cache/current")
run sync --vendor claude-code >/dev/null
for attempt in 1 2 3; do run fetch >/dev/null; done
test -d "$TMP/cache/releases/$first_release"
test "$(find "$TMP/cache/releases" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')" = 4
run sync --vendor codex >/dev/null
test -d "$TMP/cache/releases/$first_release"
run sync --vendor claude-code >/dev/null
test ! -d "$TMP/cache/releases/$first_release"
test "$(find "$TMP/cache/releases" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')" = 3
run doctor --vendor codex >/dev/null

previous_release=$(cat "$TMP/cache/current")
printf '%s|%s|main|missing-skill\n' "$SKILL" "$ROOT" > "$SOURCES_FILE"
if run fetch >/dev/null 2>&1; then
  echo "expected fetch to reject a missing SKILL.md" >&2
  exit 1
fi
test "$(cat "$TMP/cache/current")" = "$previous_release"
run doctor --vendor codex >/dev/null

rm "$TMP/home/.codex/AGENTS.md"
mkdir "$TMP/home/.codex/AGENTS.md"
if run install --vendor codex >/dev/null 2>&1; then
  echo "expected install to reject a conflicting directory" >&2
  exit 1
fi
run install --vendor codex --force >/dev/null
run doctor --vendor codex >/dev/null

rm "$TMP/home/.codex/skills/$SKILL"
if run doctor --vendor codex >/dev/null 2>&1; then
  echo "expected doctor to detect a missing symlink" >&2
  exit 1
fi

run sync --vendor codex >/dev/null
printf 'missing-managed|%s|main|agents/skills/%s\n' "$ROOT" "$SKILL" > "$SOURCES_FILE"
if run doctor --vendor codex >/dev/null 2>&1; then
  echo "expected doctor to detect a managed skill without a source" >&2
  exit 1
fi
if run sync --vendor codex >/dev/null 2>&1; then
  echo "expected sync to reject a managed skill without a source" >&2
  exit 1
fi

echo "agent-config tests passed"
