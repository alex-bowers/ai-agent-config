# Portable AI Agent Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Git-backed, tool-neutral starter repository that installs one canonical agent configuration into Claude Code, OpenAI Codex and GitHub Copilot.

**Architecture:** Store canonical instructions and skills in `agents/`. A small POSIX shell command reads configuration from environment variables and creates symlinks in each vendor's user-level discovery location, refusing to replace ordinary files or directories unless `--force` is explicit. Vendor adapters only map vendor paths; no content is duplicated.

**Tech Stack:** POSIX shell, Markdown, Git and symlinks; no third-party dependencies.

---

## File structure

| Path | Responsibility |
| --- | --- |
| `README.md` | Setup, configuration, safety model and vendor compatibility guidance. |
| `bin/agent-config` | Installer, synchroniser, doctor and status command-line interface. |
| `config/defaults.env` | Checked-in configurable defaults. |
| `agents/AGENTS.md` | Tool-neutral operating instructions. |
| `agents/skills/example/SKILL.md` | Minimal portable skill example. |
| `adapters/*.env` | Claude Code, Codex and Copilot destination mappings. |
| `tests/agent-config-test.sh` | Temporary-directory integration tests. |

### Task 1: Create canonical content

**Files:**
- Create: `agents/AGENTS.md`
- Create: `agents/skills/example/SKILL.md`
- Create: `.gitignore`

- [ ] **Step 1: Add instructions**

Create tool-neutral instructions that direct agents to inspect conventions, minimise scope, validate work, avoid secrets and report verification. Do not include vendor-specific paths.

- [ ] **Step 2: Add an example skill**

Create a skill with YAML front matter and a repeatable workflow. Explain that it is canonical here and vendor locations are installed links, not editable copies.

- [ ] **Step 3: Exclude local state**

Add `.agent-config.local.env` and `.test-tmp/` to `.gitignore`.

- [ ] **Step 4: Check content**

Run: `test -f agents/AGENTS.md && test -f agents/skills/example/SKILL.md && grep -q 'name:' agents/skills/example/SKILL.md`

Expected: success.

- [ ] **Step 5: Commit**

```sh
git add agents .gitignore
git commit -m "feat: add canonical agent instructions and example skill"
```

### Task 2: Define vendor adapters

**Files:**
- Create: `config/defaults.env`
- Create: `adapters/claude-code.env`
- Create: `adapters/openai-codex.env`
- Create: `adapters/github-copilot.env`

- [ ] **Step 1: Add configurable defaults**

Use `AGENT_CONFIG_HOME` for the checkout; let user roots such as `CLAUDE_CONFIG_DIR`, `CODEX_HOME` and `COPILOT_HOME` default from `$HOME`. Load an optional checkout-local `.agent-config.local.env`.

- [ ] **Step 2: Declare adapter targets**

Each adapter declares an ID and paths derived from its root variable. Map Claude Code and Codex instructions and skills to their supported locations. Map Copilot skills to the shared `~/.agents/skills` path and leave instructions project-level, because a universal global `AGENTS.md` loader is not assumed.

- [ ] **Step 3: Validate adapters**

Run: `for f in adapters/*.env; do test -s "$f"; done`

Expected: success.

- [ ] **Step 4: Commit**

```sh
git add config adapters
git commit -m "feat: add configurable vendor adapters"
```

### Task 3: Implement commands with tests

**Files:**
- Create: `bin/agent-config`
- Create: `tests/agent-config-test.sh`

- [ ] **Step 1: Write failing integration tests**

Set `HOME` and `AGENT_CONFIG_HOME` to a temporary directory. Test that `install --vendor codex` creates its expected symlink, a repeat install is idempotent, an ordinary conflicting target fails without `--force`, and `doctor` detects missing or incorrect links.

- [ ] **Step 2: Run the failing test**

Run: `sh tests/agent-config-test.sh`

Expected: fail because `bin/agent-config` does not exist.

- [ ] **Step 3: Implement a POSIX shell CLI**

Provide `install`, `sync`, `doctor`, `status` and `help`, with `--vendor claude-code|codex|copilot|all`, `--force` and `--dry-run`. Resolve the checkout from `AGENT_CONFIG_HOME`, then the script parent. Create parent directories only for selected targets. Existing correct links succeed; conflicts fail unless forced. `sync` aliases `install`. `doctor` fails if canonical files are absent, an adapter is unknown, or a selected link is wrong.

- [ ] **Step 4: Run checks**

Run: `sh -n bin/agent-config && sh tests/agent-config-test.sh`

Expected: both commands succeed.

- [ ] **Step 5: Commit**

```sh
git add bin tests
git commit -m "feat: add safe agent configuration installer"
```

### Task 4: Document the workflow

**Files:**
- Create: `README.md`

- [ ] **Step 1: Explain the operating model**

State that Git holds the canonical files and only symlinks are written into vendor paths. State that cloud agents need their own checkout or sync mechanism.

- [ ] **Step 2: Include exact usage**

Document clone, `./bin/agent-config install --vendor all`, `doctor`, `status`, `--dry-run`, and an override of `CODEX_HOME` in `.agent-config.local.env`. Explain that `--force` replaces only selected conflicting targets.

- [ ] **Step 3: Cover ongoing maintenance**

Give numbered instructions: edit canonical files, test and run doctor, commit/push, pull on another machine, sync and doctor. Include recovery after moving the checkout.

- [ ] **Step 4: Commit**

```sh
git add README.md
git commit -m "docs: explain portable agent configuration setup"
```

### Task 5: End-to-end verification

**Files:**
- Test: `tests/agent-config-test.sh`

- [ ] **Step 1: Run automated checks**

Run: `sh -n bin/agent-config && sh tests/agent-config-test.sh`

Expected: success.

- [ ] **Step 2: Test all vendors in isolation**

Run: `tmpdir=$(mktemp -d) && HOME="$tmpdir/home" AGENT_CONFIG_HOME="$PWD" ./bin/agent-config install --vendor all && HOME="$tmpdir/home" AGENT_CONFIG_HOME="$PWD" ./bin/agent-config doctor --vendor all`

Expected: selected symlinks are created and doctor reports them healthy.

- [ ] **Step 3: Inspect deliverables**

Run: `find agents adapters config bin tests -maxdepth 3 -type f | sort`

Expected: only intended repository files.

- [ ] **Step 4: Commit any verification fixes**

```sh
git add -A
git commit -m "test: verify portable configuration workflow"
```

## Self-review

- Canonical Git-backed skills and instructions: Task 1.
- Configurable paths: Task 2.
- Installer, sync and doctor: Task 3.
- Symlink local integration: Tasks 3 and 5.
- Claude Code, Codex and Copilot adapters: Task 2.
- README and example skill: Tasks 1 and 4.
- Safe handling of existing user configuration: Task 3.

