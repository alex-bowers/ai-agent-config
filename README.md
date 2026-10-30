# Portable AI agent configuration

This repository holds shared agent instructions, local skills and a list of
upstream skills to fetch. It links skills into supported local AI tools. Fetched
skills live in an ignored cache in this checkout, so each machine can refresh
them without committing downloaded copies.

## What it supports

| Tool | Shared skills | Shared instructions |
| --- | --- | --- |
| Claude Code | `~/.claude/skills/<skill>` | `~/.claude/CLAUDE.md` |
| OpenAI Codex | `~/.codex/skills/<skill>` | `~/.codex/AGENTS.md` |
| GitHub Copilot | `~/.agents/skills/<skill>` | Configure personal instructions in Copilot settings; project instructions remain repository-specific. |

The personal Copilot skills location and portable `SKILL.md` format follow
[GitHub's Agent Skills documentation](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills).

## Quick start

1. Create a Git repository from this directory and put it somewhere stable.
2. Review `agents/AGENTS.md` and `config/skill-sources.txt`.
3. Fetch the selected upstream skills, then install links for every supported tool:

   ```sh
   ./bin/agent-config fetch
   ./bin/agent-config install --vendor all
   ```

4. Check them:

   ```sh
   ./bin/agent-config doctor --vendor all
   ```

The command needs Git, a POSIX-compatible shell and symlink support (macOS,
Linux, or Windows via WSL). `sync` replaces links previously managed by this
repository when a fetch changes their source. Other existing targets still
require `--force`; that option affects only the selected vendor targets.

## Commands

```sh
# Download the configured upstream skills into a local cache.
./bin/agent-config fetch

# See exactly what would be linked.
./bin/agent-config install --vendor codex --dry-run

# Install one tool, or all of them (the default).
./bin/agent-config install --vendor claude-code
./bin/agent-config sync --vendor all

# Inspect configured paths or validate existing links.
./bin/agent-config status --vendor copilot
./bin/agent-config doctor --vendor all
```

`sync` is an alias for `install`. It does not access the network. Re-running it
is safe when the links already point to the selected local sources. It also
removes obsolete symlinks previously managed by this repository. Other entries
in the tools' skills directories are left alone.

## Configuration

Paths are configurable. Copy the following as `.agent-config.local.env` in the
repository root (it is ignored by Git), then change only the variables you
need:

```sh
# Example: use a separate Codex profile.
CODEX_HOME="$HOME/.codex-work"
```

The defaults are in `config/defaults.env`:

- `CLAUDE_CONFIG_DIR` defaults to `$HOME/.claude`.
- `CODEX_HOME` defaults to `$HOME/.codex`.
- `COPILOT_HOME` defaults to `$HOME/.agents`.
- `AGENT_CONFIG_CACHE_DIR` defaults to `.agent-config-cache/` in this checkout.
- `SKILL_SOURCES_FILE` defaults to `config/skill-sources.txt`.

If the local configuration does not set a value, an environment value can be
supplied for one invocation:

```sh
CODEX_HOME="$HOME/.codex-work" ./bin/agent-config install --vendor codex
```

## Add a skill

For a local skill, create one directory beneath `agents/skills/`, with a
`SKILL.md` containing `name` and `description` front matter. Include scripts
and reference material in the same directory, then run `sync`.

For an upstream skill, add a line to `config/skill-sources.txt`:

```text
skill-name|https://github.com/owner/repository.git|main|skills/skill-name
```

The fields are the local skill name, Git repository, branch or tag, and path
within that repository. HTTPS and SSH Git URLs are supported. An absolute local
repository path is also accepted. Keep entries from the same repository and
revision together so one clone can serve them. Run `fetch`, then `sync`. A
fetched skill takes precedence over a local directory with the same name.

The first successful `fetch` is required when no local skill copy exists. A
failed fetch leaves the previous cache release in use. Fetched skills may
contain instructions or scripts, so review the source before adding it and
review updates before using them. The cache keeps the three newest releases.
An older release stays until no configured tool links point to it; `sync`
checks for releases it can then remove.
Each cache release records the fetched repository revisions in `.sources`.

You may remove a checked-in skill after reviewing any files that exist only in
that copy. First run `fetch` and `sync --vendor all` on each machine so its tool
links point to the cache. Once a checked-in copy is removed, a new checkout must
run `fetch` before `sync`; `doctor` reports a missing managed skill if neither
the cache nor a checked-in copy is available.

## Ongoing workflow

1. Edit local files in `agents/`, or run `fetch` to refresh upstream skills.
2. Run `./bin/agent-config sync --vendor all` and `./bin/agent-config doctor --vendor all`.
3. Run `sh tests/agent-config-test.sh` after changing this repository's tooling.
4. Commit and push changes to local skills or the source list. On another
   machine, pull the repository, run `fetch`, then run `sync` and `doctor`.

If you move the repository, run `sync --vendor all`; the existing links will
be detected as incorrect and require `--force` to replace them deliberately.

## Scope and limits

This repository only manages local links. The ignored cache is local to this
checkout and does not travel with Git. Cloud-hosted agents need access to a
checkout, a repository-level `.agents/skills` directory, or their platform's
own sync process. Project-specific instructions should stay in the relevant
project because discovery rules and precedence vary by tool.
