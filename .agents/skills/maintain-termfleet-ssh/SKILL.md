---
name: maintain-termfleet-ssh
description: Navigate, diagnose, review, test, and safely evolve the TermFleet-SSH repository with its project guidance, CodeGraph index, and UI/UX design skill. Use for any work in this repository that touches its Tornado/Paramiko backend, xterm.js workspace, SSH or local-terminal sessions, worker lifecycle, HTTP/WebSocket contracts, browser persistence, interface design, security settings, packaging, or tests.
---

# Maintain TermFleet-SSH

## Start Every Task

1. Read the repository-root `AGENTS.md` completely.
2. Read `references/project-map.md` completely before planning or editing.
3. Inspect `git status --short`. Preserve user changes and do not rewrite unrelated files.
4. For non-trivial or cross-module work, check CodeGraph status and use it to identify symbols, call paths, and likely impact.
5. Locate and confirm the current implementation with `rg`; treat the project map and graph as navigation aids, not substitutes for source inspection.
6. State the requested outcome, assumptions, affected contracts, and a verification target before making a substantial change.

Keep changes surgical. This repository contains a large, framework-free frontend and a stateful terminal backend; prefer the minimum coherent change over speculative abstraction.

## Trace the Change End to End

Identify every affected layer before editing:

- HTTP route wiring: `webssh/main.py`
- Request validation, SSH setup, local PTY creation, and WebSocket handling: `webssh/handler.py`
- Live session ownership and I/O: `webssh/worker.py`
- CLI, security, TLS, origin, host-key, and server settings: `webssh/settings.py` and `webssh/policy.py`
- Page structure and embedded styles: `webssh/templates/index.html`
- Client state, rendering, transport, persistence, i18n, and interactions: `webssh/static/js/main.js`
- Behavioral coverage: `tests/`

For a route, message, or persisted-state change, update producers and consumers together. Search by the literal route, JSON key, form field, message key, or local-storage key before editing.

## Use Repository Tools Deliberately

Prefer CodeGraph MCP tools when the current client exposes them. Otherwise use the installed CLI from the repository root:

```bash
codegraph status .
codegraph explore "<area or workflow>" --path .
codegraph node <symbol-or-file> --path .
codegraph callers <symbol> --path .
codegraph callees <symbol> --path .
codegraph impact <symbol> --path . --depth 2
codegraph affected <changed-files...> --path .
```

Use `explore` to orient a broad change, `node` for one symbol or file, callers/callees for a behavioral path, `impact` before changing a shared symbol, and `affected` only as a test-selection hint. Confirm every result with source searches and existing tests; the graph can include noisy dependencies and can miss relevant tests. Run `codegraph sync .` after source changes. If status reports an older engine and graph queries fail with a schema error, rebuild the generated index with `codegraph index .`.

For any visual design, layout, responsive, interaction, accessibility, or UI review task, read and follow `.agents/skills/ui-ux-pro-max/SKILL.md`. Start with its required design-system search using the actual repository path:

```bash
python3 .agents/skills/ui-ux-pro-max/scripts/search.py \
  "SSH fleet operations dashboard terminal workspace <task keywords>" \
  --design-system -p "TermFleet-SSH"
```

Supplement with `--domain ux` or `--domain web` for the affected interaction. This project uses plain HTML, CSS, and JavaScript: translate relevant guidance into the existing implementation, do not add Tailwind or a framework unless explicitly requested, and do not persist a generated design system unless it is part of the requested deliverable. Reject generic landing-page or hero recommendations that conflict with the dense operational workspace. Preserve the established light workspace, dark terminal surfaces, information density, keyboard access, and bilingual UI unless the task explicitly changes them.

## Preserve Core Contracts

- Preserve the two-stage session flow unless the task explicitly replaces it: create a worker over HTTP, then bind `/ws?id=<worker-id>`.
- Preserve binary terminal output and JSON client input. JSON currently carries `data`, `resize`, and `ping`; the server replies to `ping` with JSON `pong`.
- Preserve worker cleanup semantics. Manual close terminates the SSH/local process; incidental WebSocket loss detaches it temporarily so page restoration can rebind it.
- Treat `clients` as sensitive shared state keyed by client IP. Changes to identity, proxies, multi-user behavior, or horizontal scaling require an explicit design decision.
- Never persist or expose passwords, private-key bodies, passphrases, or TOTP values. Reconnect metadata intentionally excludes secrets.
- Preserve XSRF, origin, trusted-downstream, TLS redirect, and host-key policy behavior unless the task explicitly changes the security model.
- Keep Chinese and English UI text in sync. Update accessible labels and dynamic text as well as visible labels.
- When changing terminal or group state, check browser persistence, drag/resize behavior, fullscreen behavior, restore behavior, and cleanup.

## Implement by Surface

For backend changes, add or update focused tests first when practical. Cover invalid input, ownership, resource cleanup, and the HTTP/WebSocket boundary. Avoid blocking the Tornado IOLoop with SSH work; existing SSH connection setup runs in `IndexHandler.executor`.

For frontend changes, follow the existing plain JavaScript and DOM-helper style unless a framework migration is explicitly requested. Keep state transitions centralized through existing helpers. Verify xterm fitting after any layout change and preserve stable terminal/card dimensions. Use a real browser to inspect the affected state at 375px, 768px, 1024px, and 1440px when responsive behavior is in scope.

For broad redesigns or migrations, establish the replacement boundary and migration sequence before editing. Do not silently maintain two architectures. Record intentional compatibility behavior and remove only code made obsolete by the requested change.

## Verify Proportionally

Run the narrowest relevant checks first, then broaden:

```bash
node --check webssh/static/js/main.js
.venv/bin/python -m unittest discover tests
```

Use `python -m pytest tests` only when pytest is installed. For frontend behavior, start the app and exercise affected workflows in a real browser; verify desktop and mobile layouts when UI is changed. For session work, test SSH creation, local-terminal creation, terminal I/O, resize, manual close, unexpected WebSocket loss, and refresh restoration as applicable.

Use `codegraph affected` to suggest focused tests, then verify that selection with `rg` and the test tree. Do not claim the suite is green when only syntax, graph analysis, or legacy backend tests passed. Read the coverage gaps in `references/project-map.md` and report untested behavior explicitly.

## Finish Major Updates with Git

Treat a change as major when the user calls it a major update, or when it changes multiple modules, shared contracts, session/security behavior, persistence schemas, deployment, or a substantial user workflow or interface.

After completing a major update:

1. Re-read `git status`, the complete task diff, and the configured branch/upstream. Update this skill and the project map when required, then run `codegraph sync .` for source changes.
2. Run all change-relevant focused checks and the broadest practical regression checks. Continue only when the new behavior is verified and any remaining failures are reproduced as unchanged baseline failures and reported clearly.
3. Stage only files that belong to the requested update. Never include unrelated user changes, local IDE files, generated CodeGraph data, secrets, or incidental artifacts.
4. Inspect `git diff --cached` and confirm every staged line traces to the task. Create one focused, non-interactive commit with a message that describes the delivered outcome.
5. Push the current branch with ordinary `git push` to its already configured upstream. Verify the resulting branch/upstream state and report the commit and push destination.

Never force-push, push tags, change remotes, create a new upstream, or push to the repository named `upstream` unless the user explicitly requests that exact action. If verification is not sufficient, no upstream is configured, the remote rejects the push, or authentication fails, do not work around the condition silently; stop the Git publishing step and report it. A newer user instruction to keep work local or not commit/push overrides this default.

## Keep This Skill Current

Treat this skill as part of the implementation, not as a one-time summary.

At the end of every repository task, compare the completed diff with both this file and `references/project-map.md`. Update them in the same change whenever the work alters any of the following:

- product capabilities or user workflows;
- module ownership, entry points, routes, form fields, JSON messages, or local-storage records;
- session lifecycle, worker ownership, cleanup, restoration, or security invariants;
- runtime commands, dependencies, deployment, or verification commands;
- repository guidance, skill behavior, CodeGraph configuration, UI design workflow, or Git topology;
- known test coverage, baseline failures, risks, or migration constraints;
- repeated repository-specific knowledge that would save the next task from rediscovery.

Update `SKILL.md` only for durable workflow or guardrail changes. Update `references/project-map.md` for factual project changes. Verify facts against source, keep entries concise, and avoid date-only or wording-only churn.

In the final response for future repository changes, state either that this skill was updated and why, or that it was checked and remains accurate. If repeated friction appears across tasks, improve the skill immediately instead of leaving only a conversational note.
