---
name: handoff
description: Create a concise, self-contained Markdown handoff when the user wants to continue a coding task or conversation in a fresh agent session, model, or machine. Use for context transfer, not ordinary summaries.
---

# Handoff

Create a Markdown brief that lets a stateless agent understand the work and take the next useful action. Use the current conversation and any relevant accessible artefacts as evidence. Do not imply that the brief can preserve hidden state or grant access to files, tools, or accounts in the next environment.

## Capture the state

- State the user's current objective and the precise point reached. Preserve decisions, preferences, constraints, and corrections that still govern the work.
- Separate completed work from proposed work. Record important findings and why a decision was made when that affects the next step. Label uncertainty, assumptions, and unverified claims.
- Give the next concrete action, followed by any remaining steps, blockers, or questions that require the user. Record approvals already given and approvals still needed without treating the handoff itself as authorisation.
- Include only the artefacts and evidence needed to resume: relevant links, document names, repository and file paths, commands, checks and results, or source references. For code work, report verified branch or commit details, working-tree changes, and relevant test results when available. Prefer repository-relative paths so another machine can locate files.
- Mark time-sensitive facts with a date or explain that they need rechecking. Flag anything the next agent must verify because its environment or access may differ.

## Compress without losing the thread

Write for an agent with no access to this conversation. Keep the brief short enough to scan, but retain details whose loss would cause repeated work, a wrong decision, or an unsafe action. Omit chronological narration, abandoned ideas, generic background, and sections that do not apply to the task. Do not invent missing context or present an intention as a result.

Use clear Markdown headings. A useful default is **Objective**, **Current state**, **Decisions and constraints**, **Next actions**, and **References and verification**; adapt or omit headings to fit the conversation. Make the first next action explicit. Output the handoff in the response unless the user requests a file or another destination.

Do not include credentials, secret values, private reasoning, or unnecessary personal information. Redact sensitive details and note any omission that affects the next agent's ability to proceed. A handoff is a record of context, not a substitute for the next agent checking current instructions, permissions, and mutable state.
