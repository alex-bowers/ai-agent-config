---
name: github-descriptions
description: Generate GitHub PR descriptions formatted as copyable markdown. Use when asked to "create a PR description", "describe the changes", "make a PR for these changes", or any request for PR body text. For GitHub issue descriptions, use the github-issue-writer skill instead.
---

# GitHub PR Descriptions

When generating PR descriptions, always present the output as a fenced markdown code block so the user can easily copy and paste it into GitHub.

## Workflow

1. **Gather context** — Use git tools to understand the changes:
   - Diff the branch against its base (e.g. `main..branch`), review commit messages, and read changed files.

2. **Load the template** — Check for templates in this order, using the first one found:
   - **Prompt-level template**: Look for a template file referenced in the user's prompt or workspace instructions (e.g. `.github/PULL_REQUEST_TEMPLATE.md`, or any path the user specifies).
   - **Repo-level template**: Search the repository for `.github/PULL_REQUEST_TEMPLATE.md`, `.github/PULL_REQUEST_TEMPLATE/`, or `PULL_REQUEST_TEMPLATE.md` at the repo root.
   - **Default template**: If no prompt-level or repo-level template is found, use the default template defined in this skill (see below).

3. **Write the description** following the loaded template.

4. **Present the output** inside a fenced markdown code block (` ```markdown ... ``` `) so the user can copy it directly. Do NOT render it as regular markdown prose — always wrap it in a code block.

## Default PR Description Template

```markdown
## [Title]

### Summary

[1–2 sentence plain-language summary of what this PR does and why.]

### Changes

**New files**
- `path/to/file.ext` — [Brief description of what the file adds]

**Modified files**
- `path/to/file.ext` — [What changed and why]

### How to test

1. [Step to set up or start the app]
2. [Action to perform]
3. [What to verify — be specific about expected outcomes]
4. [Edge cases or additional checks]
5. [API or manual verification steps if applicable]
```

## Guidelines

- **Be specific**: Reference actual file paths, function names, and endpoint URLs rather than vague descriptions.
- **Be concise**: Each changed-file entry should be one line. Avoid restating the obvious.
- **Be accurate**: Only describe changes that actually exist in the diff. Never fabricate or assume changes.
- **Include test steps**: PR descriptions must always include a "How to test" section with numbered, reproducible steps.
- **Use present tense**: Describe what the code does, not what it will do.
- **Format for copy-paste**: Always wrap the final output in a ` ```markdown ``` ` code block.
