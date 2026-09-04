---
name: branch-review
description: Review a branch before opening a pull request by inspecting the proposed diff, running relevant project checks, and routing focused checks for documentation, frontend, security, configuration, dependency, and data changes. Use for requests such as "review my branch", "pre-PR check", "PR readiness review", or "sanity-check these changes before review".
---

# Branch review

Perform an evidence-led pre-PR review that catches likely mistakes before a human reviewer spends time on them. Review the proposed change, its necessary context, and the project conventions; do not re-review unrelated existing code or substitute this process for peer review.

The default mode is review-only. Do not edit files, create commits, push branches, run migrations, deploy, or change external services unless the user separately asks for that work.

## Inputs and scope

Accept an optional base branch or ref, for example `origin/main`, and an optional request to include uncommitted changes.

1. Establish the intended pull-request base branch before reviewing. Use an explicitly supplied ref or reliable repository/PR metadata. A configured remote default branch is only a fallback when it clearly matches the intended PR target.
2. If the base cannot be determined confidently, ask a short question. Do not silently compare against an arbitrary `main`, `master`, or upstream branch.
3. Calculate the merge base, then review the committed PR diff from that merge base to `HEAD`. State the base ref and merge base in the report.
4. Inspect `git status --short`. Uncommitted or staged changes are not part of a PR by default. Review them only when requested, and report them separately from the committed PR diff.
5. Check the diff for whitespace errors and merge-conflict markers. Identify binary, generated, vendored, lockfile, and large-file changes early; do not spend the same review effort on generated output as on hand-written source.
6. Read applicable repository instructions and conventions before judging the change, including `AGENTS.md`, `CONTRIBUTING.md`, README guidance, package manifests, formatter/linter/test configuration, and nearby code patterns.

When the committed range is empty, say so clearly. If only uncommitted changes exist, do not describe the branch as PR-ready.

## Review workflow

### 1. Build a change map

Classify each changed path and select every applicable route below. A file can require more than one route: a Vue component, for example, needs source-code, frontend, and security review.

| Changed content | Apply this route |
| --- | --- |
| Any changed path | Universal checks and the `security-review` skill |
| Documentation: `*.md`, `*.mdx`, `*.rst`, `*.txt`, changelogs, guides, `docs/` | Documentation review |
| Application or library source; server code; scripts; test files | Code and test review |
| HTML and templates: `*.html`, `*.htm`, `*.vue`, `*.svelte`, `*.astro`; UI-bearing JSX/TSX; frontend styles | Frontend review |
| Package manifests, lockfiles, dependency declarations | Dependency review |
| CI/CD, Docker, deployment, environment examples, IaC, permissions, secrets configuration | Configuration and automation review |
| Database schemas, migrations, data transformations, queues, jobs | Data and operational-change review |
| Generated, vendored, minified, binary, or large files | Change-integrity review |

Classify from the content and project layout, not only filename extensions. For example, a `.ts` file in a browser application can be frontend code, while a Markdown file containing executable setup instructions also needs technical accuracy checks.

### 2. Apply universal checks

For every changed path:

- Use the sibling `security-review` skill and follow its required workflow. Scope the review to the changed code and the context needed to trace its data flows. Include secrets exposure, injection, authorisation, unsafe input handling, dependency risk, CI/IaC permissions, and sensitive-data handling where relevant. For binary or opaque generated files, inspect their metadata, provenance, and supporting source/configuration; state that their contents could not be fully inspected if that is the case.
- Check that the change is intentional, complete, and within the stated task. Flag accidental debug output, dead code, commented-out code, placeholder values, merge artefacts, unexplained generated churn, and unrelated formatting changes when they make review harder or hide risk.
- Assess behaviour, error handling, input validation, backwards compatibility, and failure modes in the changed execution path. Follow calls into nearby unchanged code only as far as needed to verify the change.
- Check that changed tests prove the intended behaviour and failure cases rather than merely increasing coverage. Identify missing tests only when the altered behaviour has a meaningful, testable risk.
- Run the project’s established, relevant validation commands when they are available and safe. Prefer the narrowest useful tests, linting, type checks, builds, or static checks. Do not install, remove, or upgrade dependencies to make a check run.
- Report actual command results separately from review judgement. A check that could not run is a limitation, not a pass.

Do not raise a finding solely because an unchanged surrounding line is imperfect. Explain when an existing issue becomes newly reachable or worse because of the branch.

### 3. Documentation review

For documentation changes:

- Proofread the changed prose for spelling, grammar, punctuation, clarity, and consistent terminology. Use the project’s established language and spelling convention; use UK English when none is defined.
- Verify headings, lists, links, anchors, code fences, command examples, file paths, configuration names, version claims, and prerequisites against the repository.
- Check that instructions are ordered, safe, and complete enough to follow. Flag stale behaviour claims, misleading commands, undocumented required configuration, and accidental secrets in examples.
- Preserve deliberate product names, API identifiers, code symbols, and regional spelling. Do not report subjective wording preferences as defects.

### 4. Code and test review

For hand-written code and tests:

- Compare implementation choices with local patterns and project standards rather than imposing a new architecture or style.
- Check interfaces, types, null/error paths, resource cleanup, concurrency or idempotency where applicable, logging, observability, and user-visible error behaviour.
- Check changed tests for correct setup, assertions, isolation, determinism, and coverage of the newly introduced risk. Ensure tests would fail for the relevant broken behaviour.
- Use existing formatter, linter, type-checker, test, and build commands where applicable. If the repository documents a verification sequence, follow it proportionately.

### 5. Frontend review

For user-facing frontend changes, load and apply both sibling skills:

1. Use the `html` skill for changed markup and template structure. Check semantic elements, headings and landmarks, labels, native controls, links versus buttons, image text alternatives, keyboard use, visible focus, valid template bindings, and unnecessary wrapper markup. For JSX/TSX, apply the same semantic checks to rendered HTML without treating framework syntax as invalid HTML.
2. Use the `web-quality-audit` skill for affected user-facing pages, components, or journeys. If a runnable local target and suitable route are available, gather equivalent live evidence and exercise the changed interaction. If not, carry out its source-level smoke checks and label all resulting performance, accessibility, SEO, and browser-behaviour observations as source hypotheses rather than measured results.

Also inspect responsive behaviour, loading/error/empty states, form validation and error announcements, contrast, target size, layout-shift risks, and client-side data handling when the change affects them. Never claim Lighthouse scores, Core Web Vitals, or live keyboard behaviour without actually measuring or exercising them.

### 6. Dependency review

For manifest and lockfile changes:

- Confirm each dependency change supports the branch purpose and is consistent across the manifest and lockfile.
- Flag unexpected broad lockfile churn, duplicate or obsolete dependencies, unpinned sources where project policy requires pinning, and runtime dependencies that should be development-only (or the reverse).
- Run the package manager’s existing audit or validation command only when it is already available and safe to run. Do not mutate the lockfile or install packages merely to audit it.
- Let the `security-review` skill assess known vulnerability, supply-chain, and secret-exposure concerns.

### 7. Configuration and automation review

For CI/CD, Docker, environment, deployment, and infrastructure changes:

- Check triggers, path filters, working directories, permissions, secret references, least privilege, trusted inputs, artifact handling, cache keys, and rollback or failure behaviour.
- Check that examples contain placeholders rather than credentials and that default values are safe for their intended environment.
- Flag changes that publish, deploy, broaden permissions, expose a service, alter authentication, or could mutate production data. Do not perform those actions during the review.

### 8. Data and operational-change review

For migrations, schemas, jobs, and data transformations:

- Check compatibility between old and new application versions during rollout, data loss risk, ordering, backfill strategy, locking or runtime cost, retries, idempotency, and rollback or recovery plans.
- Check that migration and job tests use representative data and preserve constraints and invariants.
- Identify operational checks a human must complete if code inspection cannot establish safety. Do not run migrations or mutate data.

### 9. Generated and binary changes

For generated, vendored, minified, binary, or large files:

- Verify their source and regeneration path where available.
- Review the inputs, manifest, configuration, or source files that produced the output rather than attempting line-by-line review of generated content.
- Flag unexpected output, size growth, missing source changes, generated secrets, or binaries that should not be committed.

## Findings standard

Report only issues that are credible and useful before a PR. Avoid style-only nits already enforced by automated tools, speculative vulnerabilities without an attack path, and generic advice unrelated to the diff.

For every finding, re-check the surrounding context and include:

- severity: `Must fix`, `Should fix`, `Question`, or `Note`;
- category and exact `path:line` where possible;
- evidence from the diff, code, command result, or live observation;
- concrete impact; and
- a concise, proportionate recommendation.

Use `Must fix` for clear correctness, security, data-loss, compatibility, or release-blocking failures. Use `Should fix` for credible risks that should normally be resolved before review. Use `Question` when intent or project context is required. Use `Note` sparingly for useful non-blocking observations.

## Report structure

Use this format unless the user requests another format:

```markdown
# Pre-PR branch review

## Decision
Ready for PR | Changes required before PR | Needs owner decision

## Scope and evidence
- Base: `<base ref>`; merge base: `<commit>`
- Reviewed: `<committed diff range>`
- Uncommitted changes: included | excluded | none
- Change routes: documentation, code, frontend, security, ...
- Commands run: `<command>` — pass | fail | not run (reason)

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
- State unavailable tools, skipped checks, missing test environments, and checks requiring a human or CI.
```

If there are no findings, say `No pre-PR issues found in the reviewed scope`, then retain the scope, completed checks, and limitations. This is not a claim that the change is defect-free or a substitute for peer review.

## Completion criteria

A review is complete when it has:

- established and reported the correct comparison range;
- inspected the changed paths and required local context;
- run all applicable review routes, including `security-review` for relevant text-based changes;
- applied `html` and `web-quality-audit` for applicable frontend work;
- run or transparently skipped relevant project checks; and
- provided a clear evidence-based decision without modifying the branch.
