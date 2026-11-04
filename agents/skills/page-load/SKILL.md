---
name: page-load
description: Capture and compare cold-cache page-load network waterfalls for local or public web pages, and optionally explain delays using the capture and codebase. Use when the user asks what loads, what waits, or how a code change affected page-load requests.
---

# Page load waterfall

Use the bundled Node command for deterministic capture and comparison. It starts the installed Chrome browser, needs no AI to gather timing data, and writes a self-contained HTML report plus JSON under `.page-load/` in the current repository. Keep Chrome's normal certificate checks enabled, including for `.test` sites.

## Chrome access from Codex on macOS

The capture command launches a native Chrome process and connects to its local debugging endpoint. In Codex's default macOS command sandbox, Chrome may quit before that endpoint starts. Request the command tool's approved local process access for the **first** capture attempt; do not launch Chrome inside that sandbox as a probe. Explain that the approval is for starting headless Chrome, loading the requested page, and opening the report in Chrome. Do not disable Chrome's own sandbox or certificate checks.

If approval is unavailable or denied, stop and give the user the terminal command to run outside Codex. If the approved launch fails, report the error and stop rather than repeatedly relaunching Chrome. `compare` without `--open` only reads local captures; `compare --open` also launches the browser and may need local process access.

## Capture

1. Work from the website repository. If the target URL is missing, ask for it; do not guess a production URL.
2. Run `node <skill-directory>/scripts/page-load.mjs capture <url> --open` from the repository root. Quote the URL as a single shell argument. The flag opens the generated report in Chrome after capture.
3. Give the user the report's local path and a short factual summary: run count, load-event median, request count, and any capture or browser-opening errors. The report also shows document time to first byte, First Contentful Paint, the latest Largest Contentful Paint candidate seen during the capture, and request/byte totals by resource type and host. If opening fails, give the user `open -a 'Google Chrome' '<report-path>'` on macOS instead of retrying. Do not interpret causes unless asked.
4. Keep the directory path for a later comparison. The command runs Chrome three times with isolated browser state, waits two seconds after each load event, and stores no response bodies or headers.

## Compare

1. After the code changes, capture the same page again under the same local or public environment.
2. Run `node <skill-directory>/scripts/page-load.mjs compare <before-directory> <after-directory> --open`. If browser access is unavailable, omit `--open` and give the user the report path and browser-opening command.
3. Give the user the interactive comparison report and factual deltas. Do not make optimisation recommendations unless asked.

## Interpret only on request

When asked to explain results, read the two `capture.json` files and inspect relevant source files. Use request initiators, timing, size, and code to identify a plausible dependency chain. For new captures, each request's optional `timing` contains page-relative send and response-header times plus available DNS, connection, TLS and proxy durations. Before-send time includes queueing and setup; it is not a measured blocked-by-another-asset duration. Waiting for a response includes network latency and server work. DNS and TLS may overlap connection setup, so do not sum them with the main phases. A later request start alone does not establish that another asset blocked it. For main-thread work, inspect each run's optional `mainThread.frames` and script attribution. These are Chrome long animation frames of at least 50 ms, not a full CPU trace; a script source is an entry point and can be absent. Do not claim that a network request caused a long frame based on timing alone. Distinguish network waiting, server response time, late discovery, and main-thread work. Cite relevant file and line numbers for code suggestions. Do not edit code unless the user asks for a change.

When DNS lookup takes several seconds or varies substantially between runs, especially for a local `.test` domain, check the capturing machine's resolver and network before attributing the delay to website code. Flag comparisons where DNS variation dominates the result and suggest repeating the capture on another network when practical. If the user asks for deeper DNS diagnosis, a Chrome NetLog with the default private-information stripping can help distinguish speculative lookups, cache hits and retries. Review even a stripped NetLog before sharing it because it can contain hostnames and URLs. Do not capture a NetLog automatically, or warm or subtract DNS from the standard cold-cache measurement.

## Terminal-only use

The same command works without invoking Codex. From any repository, run `node ~/.codex/skills/page-load/scripts/page-load.mjs capture 'https://example.test/'` after this skill has been synced. Then ask Codex to interpret a saved capture whenever needed.

## Limits

- Requires Node 22 or newer and Chrome or Chromium. Set `PAGE_LOAD_CHROME` to the browser executable if it is not found.
- Uses an empty browser context and disables cache for each run. It does not log in or simulate page interactions.
- Captures may include full request URLs, including query strings. Keep `.page-load/` local and do not share a capture without checking it for sensitive URLs.
- A timed-out page can still produce a partial capture; the report labels it.
