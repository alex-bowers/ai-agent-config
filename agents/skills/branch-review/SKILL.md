---
name: branch-review
description: Review a branch before opening a pull request. Establish the intended comparison range, inspect the proposed diff and relevant local context, run proportionate checks, and use available specialist skills when the change warrants them.
---

# Branch review

Perform an evidence-led pre-PR review that identifies credible issues before human review. Review the proposed change, the context needed to understand it, and relevant repository conventions. Do not re-review unrelated existing code or substitute this process for peer review.

Default mode is review-only. Do not edit files, create commits, push branches, install or upgrade dependencies, run migrations, deploy, or change external services unless the user separately asks.

## Establish scope

Accept an optional base branch or ref, and an optional request to include uncommitted changes.

1. Establish the intended PR base from an explicitly supplied ref, PR metadata, or reliable repository metadata.
2. If the base cannot be determined confidently, ask a short question. Do not silently compare against an arbitrary `main`, `master`, or upstream branch.
3. Calculate the merge base and review the committed range from that merge base to `HEAD`. State both in the report.
4. Inspect `git status --short`. Uncommitted changes are excluded by default; include them only when requested, and report them separately.
5. Inspect the diff summary first. Identify binary, generated, vendored, lockfile, and unusually large changes before reviewing file contents.
6. Read applicable repository instructions and conventions. Start with relevant `AGENTS.md`, `CONTRIBUTING.md`, README guidance, package manifests, and nearby configuration or code patterns. Do not recursively read unrelated documentation.

If the committed range is empty, say so clearly. If only uncommitted changes exist, do not describe the branch as PR-ready.

## Change map and specialist routing

Classify changed paths and their execution context. Apply review effort proportionately to risk, change size, and available evidence.

Use available specialist skills only when they materially improve the review. Choose the smallest useful set rather than running a fixed checklist.

Examples:

- Security-focused review for executable code, dependencies, authentication, user-controlled input, data handling, CI/CD, infrastructure, permissions, secrets, and sensitive configuration.
- Documentation review for user instructions, guides, release notes, or technical reference material.
- Frontend, accessibility, or web-quality review for rendered UI, templates, browser interactions, styles, or client-side data handling.
- Dependency review for manifests, lockfiles, or declared external sources.
- Operational review for schemas, migrations, background jobs, queues, or data transformations.
- Change-integrity review for generated, vendored, minified, binary, or large files.

For documentation-only changes, perform a lightweight security check for exposed secrets and unsafe or misleading commands. For generated or opaque files, inspect provenance, metadata, and supporting source/configuration; state any limitation on content inspection.

Record the specialist skills used and any relevant unavailable skill as a limitation. Do not treat unavailable tooling as a failed check.

## Review

For each materially changed execution path, assess:

- Intent and completeness: whether the change appears deliberate, complete, and within the apparent task.
- Correctness and failure modes: behaviour, error handling, input validation, compatibility, resource handling, and meaningful edge cases.
- Security: credible attack paths involving secrets, injection, authorisation, unsafe inputs, dependency risk, CI/IaC permissions, and sensitive-data handling.
- Tests: whether changed or existing tests prove the altered behaviour and meaningful failure cases. Flag missing tests only where the new risk is testable and significant.
- Reviewability: accidental debug output, dead or commented-out code, placeholders, merge artefacts, unexplained generated churn, or unrelated formatting changes that hide risk.
- Documentation accuracy: changed commands, paths, configuration names, prerequisites, links, and behaviour claims against the repository.

For user-facing changes, inspect semantics, labels, native controls, links versus buttons, keyboard and focus behaviour, form errors, loading/error/empty states, responsive layout, contrast, target size, and client-side data handling. Only make claims about live browser behaviour, performance metrics, or accessibility testing when those were actually exercised or measured; otherwise label observations as source-level hypotheses.

For configuration and automation changes, inspect triggers, path filters, working directories, permissions, secret references, trusted inputs, artifact handling, cache keys, failure behaviour, and whether the change could publish, deploy, broaden access, expose a service, alter authentication, or mutate production data.

For data or operational changes, inspect rollout compatibility, data-loss risk, ordering, locking/runtime cost, retries, idempotency, recovery, and rollback. Do not run migrations or mutate data.

## Validation

Run established, safe validation commands when available. Prefer the narrowest useful command for the changed package or behaviour:

1. Focused tests, linting, type checks, or static checks for the changed area.
2. Documented package-level validation.
3. Broader repository checks only when the change warrants them and they are safe to run.

Do not install, remove, or upgrade dependencies to make a check run. Do not run undocumented full-repository builds or test suites merely because they exist when a narrower established command covers the change.

Report actual command results separately from review judgement. A skipped or unavailable check is a limitation, not a pass.

## Scale and context discipline

Start from the diff summary and prioritise hand-written source, changed behaviour, and files that drive generated output.

For large, repetitive, generated, lockfile-heavy, or multi-package changes:

- Summarise repetitive churn rather than inspecting every equivalent line.
- Inspect representative samples plus the sources, manifests, or configuration that produced the change.
- Follow code into unchanged context only as far as needed to verify the altered behaviour.
- State any unreviewed portion or evidence gap.
- Ask the owner to narrow scope or provide a targeted focus when the available review budget cannot support a reliable whole-diff assessment.

Keep findings concise. Include only actionable issues; use short evidence excerpts and summarise routine command output.

## Findings standard

Report only credible and useful pre-PR issues. Avoid style-only nits already enforced by automated tools, speculative vulnerabilities without an attack path, and generic advice unrelated to the diff.

For every finding, include:

- Severity: `Must fix`, `Should fix`, `Question`, or `Note`.
- Category and exact `path:line` where possible.
- Evidence from the diff, code, command result, or live observation.
- Concrete impact.
- A concise, proportionate recommendation.

Use `Must fix` for clear correctness, security, data-loss, compatibility, or release-blocking failures. Use `Should fix` for credible risks that should normally be resolved before review. Use `Question` when intent or project context is required. Use `Note` sparingly for useful non-blocking observations.

## Report format

```markdown
# Pre-PR branch review

## Decision
Ready for PR | Changes required before PR | Needs owner decision

## Scope and evidence
- Base: `<base ref>`; merge base: `<commit>`
- Reviewed: `<committed diff range>`
- Uncommitted changes: included | excluded | none
- Change map: `<brief classification>`
- Specialist skills used: `<skills>` | none
- Commands run:
  - `<command>` — pass | fail | not run (`reason`)

## Findings
### Must fix
- **[Category] Title** — `path/to/file:line`
  - Evidence: ...
  - Impact: ...
  - Recommendation: ...

### Should fix
...

### Questions
...

## Checks passed
- List only meaningful checks that were actually completed.

## Limitations and follow-up
- State skipped or unavailable tools/checks, unreviewed scope, missing test environments,
  and checks requiring human or CI confirmation.
```

If there are no findings, state: `No pre-PR issues found in the reviewed scope.` Retain the completed checks and limitations. This is not a claim that the change is defect-free or a substitute for peer review.

## Completion criteria

A review is complete when it has:

- established and reported the correct comparison range;
- inspected changed paths and the local context needed to assess them;
- applied proportionate universal and specialist review;
- run or transparently skipped relevant safe validation;
- identified evidence gaps; and
- provided a clear, evidence-based decision without modifying the branch.
```
