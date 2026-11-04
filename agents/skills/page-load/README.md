# Page load waterfall

This skill bundles a Node script that measures a page in Chrome and creates an
interactive HTML waterfall. It also compares two captures. The script does the
measurement and comparison without AI; ask Codex to interpret the results only
when you want help with the findings or your code.

## Requirements

- Node 22 or newer and Chrome or Chromium. No npm packages are required.
- A URL that Chrome can open with normal certificate checks, including a local
  `.test` URL if its certificate is trusted.

From the agent configuration repository, run
`./bin/agent-config sync --vendor codex` to make the skill available to Codex.
Set `PAGE_LOAD_CHROME=/path/to/chrome` if Chrome is not in a standard location.

## Use in Codex for VS Code

Open the website repository and ask Codex:

```text
Use $page-load to capture https://example.test/
```

After changing the page, ask Codex to capture the same URL again and compare it
with the previous capture. Ask it to explain the comparison if you want code
suggestions. Capturing through Codex uses AI to run the command, but the command
itself gathers and processes the browser data without AI.

On macOS, Codex may ask you to approve local process access before capture so
it can launch headless Chrome. Approving that command avoids a failed launch
inside Codex's command sandbox. If approval is unavailable, run the capture
from your VS Code terminal and ask Codex to interpret the saved result. The
comparison command does not launch Chrome. Do not turn off Chrome's own sandbox
or certificate checks.

## Use from the terminal

From the website repository, run:

```sh
node ~/.codex/skills/page-load/scripts/page-load.mjs capture 'https://example.test/'
node ~/.codex/skills/page-load/scripts/page-load.mjs compare '.page-load/<before>' '.page-load/<after>'
```

The command prints the report path. Each capture makes three visits with an
empty browser cache and continues recording for two seconds after the load
event. The report lets you inspect request timing, initiators and failures, and
filter or zoom the waterfall. A later request start alone does not prove that
another asset blocked it.

## Results and privacy

The command saves JSON and a self-contained HTML report under `.page-load/` in
the website repository. That directory creates its own Git ignore rule. The
capture excludes request and response bodies and headers, but it can include
full request URLs with query strings. Check results for sensitive URLs before
sharing them.
