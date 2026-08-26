# Portable AI agent configuration

This starter repository is the canonical, Git-backed source for shared agent
instructions and skills. It links that source into supported local AI tools; it
does not copy files. Edit this repository, commit the change, then pull and
sync it on another machine.

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
2. Review `agents/AGENTS.md` and replace the example skill with your own work.
3. Install links for every supported tool:

   ```sh
   ./bin/agent-config install --vendor all
   ```

4. Check them:

   ```sh
   ./bin/agent-config doctor --vendor all
   ```

The command needs a POSIX-compatible shell and symlink support (macOS, Linux,
or Windows via WSL). It never changes an existing target unless you add
`--force`; that option affects only the selected vendor targets.

## Commands

```sh
# See exactly what would be linked.
./bin/agent-config install --vendor codex --dry-run

# Install one tool, or all of them (the default).
./bin/agent-config install --vendor claude-code
./bin/agent-config sync --vendor all

# Inspect configured paths or validate existing links.
./bin/agent-config status --vendor copilot
./bin/agent-config doctor --vendor all
```

`sync` is an alias for `install`. Re-running it is safe when the links
already point to this checkout.

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

If the local configuration does not set a value, an environment value can be
supplied for one invocation:

```sh
CODEX_HOME="$HOME/.codex-work" ./bin/agent-config install --vendor codex
```

## Add a skill

Create one directory per skill beneath `agents/skills/`, with a `SKILL.md`
file containing `name` and `description` front matter. Include scripts or
reference material in that same directory. Then run
`./bin/agent-config sync --vendor all`.

## Ongoing workflow

1. Edit the canonical files in `agents/`.
2. Run `sh tests/agent-config-test.sh` and `./bin/agent-config doctor --vendor all`.
3. Commit and push the repository.
4. On another machine, pull the repository and run `./bin/agent-config sync --vendor all`.
5. Run doctor again to confirm the links.

If you move the repository, run `sync --vendor all`; the existing links will
be detected as incorrect and require `--force` to replace them deliberately.

## Scope and limits

This repository only manages local links. Cloud-hosted agents need access to a
checkout, a repository-level `.agents/skills` directory, or their platform's
own sync process. Project-specific instructions should stay in the relevant
project because discovery rules and precedence vary by tool.
