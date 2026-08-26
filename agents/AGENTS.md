# General Principles

- Prefer the simplest solution that fully meets the requirements.
- Build only what is needed for the current scope.
- Minimise complexity and avoid unnecessary abstraction.
- Follow existing project conventions unless there is a clear benefit to changing them.
- Explain significant technical decisions and trade-offs before implementation.
- Prefer incremental improvements over large rewrites.
- Preserve existing behaviour unless a change is explicitly requested.
- Ask for clarification rather than making assumptions when requirements are ambiguous.

# Documentation

Write documentation using clear, plain UK English that is easy for both humans and AI coding agents to understand.

## General

- Follow the principles of the Google Developer Documentation Style Guide.
- Prefer clarity over cleverness.
- Be concise without omitting important information.
- Write in an active voice.
- Use consistent terminology throughout a document.
- Avoid unnecessary adjectives, marketing language and filler.

## Structure

- Begin with a short overview or purpose statement.
- Use descriptive headings that make the content easy to scan.
- Present procedures as numbered steps.
- Use bullet lists for related information.
- Keep each section focused on a single topic.
- Include examples where they improve understanding.

## Technical Writing

- Use one term for each concept and use it consistently.
- Define acronyms the first time they appear.
- State assumptions and prerequisites explicitly.
- Prefer complete, working examples over isolated snippets where practical.
- Explain why something should be done when it is not obvious.

## AI-Friendly Writing

- Express one idea per paragraph.
- Keep sentences reasonably short.
- Avoid ambiguous references where the subject may be unclear.
- Make requirements and instructions explicit rather than implied.
- Ensure headings and terminology are easy to search and retrieve.

## Markdown

- Use GitHub Flavoured Markdown.
- Use fenced code blocks with language identifiers.
- Keep tables simple and readable.
- Avoid excessive nesting of lists.

# Engineering Principles

## Simplicity

- Prefer simple, maintainable solutions over clever or overly abstract designs.
- Reduce moving parts wherever practical.
- Avoid over-engineering and premature optimisation.

## Dependencies

- Minimise third-party dependencies.
- Prefer first-party implementations when they are practical to build, maintain and secure.
- Use platform-native APIs and modern web standards wherever baseline browser support is sufficient.
- Use `pnpm` for JavaScript package management.
- Always ask for approval before introducing a new dependency.
- Explain why it is needed, why a native or first-party solution is unsuitable, and the maintenance, security and performance implications.

## Preferred Technology Stack

Unless there are significant technical constraints, prefer:

1. Cloudflare
   - Workers
   - Wrangler
   - R2
   - D1
   - KV
   - Durable Objects
   - Queues
   - Workers AI
   - Workflows

2. Laravel

3. SQLite where appropriate for the project's size and workload.

Do not recommend alternative platforms or infrastructure without explaining the technical trade-offs.

## Security

Design every project with security in depth, unless told otherwise.

Assume internal applications are protected by Cloudflare Zero Trust, but do not rely on Zero Trust as the only security boundary.

Where appropriate:

- Implement local authentication and authorisation.
- Follow the principle of least privilege.
- Validate all input.
- Use secure defaults.
- Never expose secrets or credentials.
- Use parameterised database queries.
- Minimise the attack surface.
- Avoid unnecessary external services.
- Fail securely by default.

## Performance

- Prefer efficient solutions with low runtime overhead.
- Optimise network requests before computation.
- Reduce JavaScript where HTML and CSS are sufficient.
- Prefer modern CSS and browser APIs over JavaScript where practical.
- Avoid unnecessary client-side frameworks.
- Design caching into the solution from the outset.

## Resilience

- Prefer graceful degradation over hard failure.
- Assume external services may become unavailable.
- Handle transient failures with appropriate retries or fallbacks.
- Keep critical functionality independent wherever possible.

## Observability

- Add structured logging for meaningful events.
- Produce actionable error messages.
- Include sufficient diagnostics to simplify debugging.
- Design systems that are easy to monitor and maintain.

## Code Quality

- Write clear, maintainable code over clever code.
- Keep functions, classes and modules focused on a single responsibility.
- Refactor duplicated logic rather than copying it.
- Prefer readability over brevity.
- Leave the codebase simpler than you found it.

# AI Collaboration

- Explain architectural recommendations before implementing them.
- Highlight assumptions and trade-offs.
- Suggest alternatives when they provide meaningful benefits.
- Challenge proposals constructively where there are significant technical concerns.
- Do not make unnecessary changes outside the requested scope.
- When a request could impact security, performance or maintainability, explain the implications before proceeding.
- Prefer plans that are easy to review, test and iterate.
