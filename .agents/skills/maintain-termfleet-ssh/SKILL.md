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
6. State the requested outcome, assumptions, affected contracts, and the acceptance points the user should inspect before making a substantial change.

Keep changes surgical. This repository contains a large, framework-free frontend and a stateful terminal backend; prefer the minimum coherent change over speculative abstraction.

## Leave All Verification to the User

The user exclusively owns verification and acceptance in this repository. This rule overrides any verification instruction elsewhere in this skill, its references, the UI/UX skill, or the general workflow.

- Never start, restart, or connect to the application, a development server, a test server, a preview server, or a container for verification. Do not reuse an already-running service to inspect behavior.
- Never run tests, linters, formatters in check mode, syntax or type checks, builds, smoke tests, health checks, HTTP/WebSocket probes, browser automation, screenshots, or manual functional checks.
- Source inspection, CodeGraph navigation, and Git status/diff review remain allowed for understanding scope and protecting unrelated changes, but they are not evidence that the implementation works.
- Add or update focused tests when the change warrants them, but do not execute those tests.
- At handoff, give the user the exact commands and functional scenarios they should verify, state clearly that verification was not run, and never claim that tests pass or behavior was verified.

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

Supplement with `--domain ux` or `--domain web` for the affected interaction. This project uses plain HTML, CSS, and JavaScript: translate relevant guidance into the existing implementation, do not add Tailwind or a framework unless explicitly requested, and do not persist a generated design system unless it is part of the requested deliverable. Reject generic landing-page or hero recommendations that conflict with the dense operational workspace. Preserve the themeable workspace, dark terminal surfaces, information density, keyboard access, and bilingual UI unless the task explicitly changes them. Keep the dark workspace in the terminal's navy, blue, and cool-gray family, with surrounding panels slightly lighter than the terminal body. Workspace theme changes must not alter terminal CSS variables, `TERMINAL_THEME`, or xterm scrollbar colors unless the user explicitly requests a terminal palette change.

## Preserve Core Contracts

- Preserve the two-stage session flow unless the task explicitly replaces it: create a worker over HTTP, then bind `/ws?id=<worker-id>`.
- Preserve binary terminal output and JSON client input. JSON currently carries `data`, `resize`, `ping`, and OSC 7-derived `cwd`; the server replies to `ping` with JSON `pong`.
- Preserve the upload boundary: `/upload` streams one raw file body to a temporary file, resolves the target Worker by client IP and worker ID, then writes through SFTP or the local process account. Bash, Zsh, and Fish sessions receive a non-persistent prompt hook that reports OSC 7 `cwd` updates; other shells fall back to the SSH home or local startup directory. Keep size limits, temporary-file cleanup, absolute-path checks, and explicit overwrite consent intact.
- Detect the login shell through the existing encoding-detection exec channel before installing a directory-tracking hook. Do not open an additional SSH channel solely for shell detection: some servers restrict session channels, and the repository test server depends on the original shell-plus-encoding-channel sequence.
- Preserve worker cleanup semantics. Register workers through the canonical per-IP map after asynchronous connection setup; never retain a fallback `clients[ip]` dictionary across a `yield`. Each Worker owns one generation-guarded recycle timeout: binding or closing cancels it, while incidental WebSocket loss replaces it with the detach grace period so page restoration can rebind. Manual close terminates the SSH/local process, and registry cleanup remains identity-aware and idempotent even when transport close raises.
- Treat `clients` as sensitive shared state keyed by client IP. Changes to identity, proxies, multi-user behavior, or horizontal scaling require an explicit design decision.
- Never persist or expose passwords, private-key bodies, passphrases, or TOTP values. Reconnect metadata intentionally excludes secrets.
- Treat broadcast commands as potentially sensitive. Keep command history browser-local, bounded, and scoped by group. Keep terminal selection and operation scope browser-local, persisted, and group-scoped: store only boolean scope/selection state in the existing group and session records, apply the selected subset to both broadcasts and group uploads only while that group's explicit scope control is in selected mode, and block zero selections rather than falling back to the whole group. An explicit empty submit broadcasts one Enter control sequence without adding a history record. Built-in candidates must remain read-only diagnostic commands, and neither history nor common candidates may be sent until the user explicitly broadcasts the selected command.
- Keep pinned-group restoration declarative and browser-local while the app has no authenticated user boundary. `wssh-groups` may persist sanitized terminal descriptors, but server-side JSON would be shared across users and must not be introduced without an ownership design. Automatically reconnect only local terminals and SSH descriptors that require no persisted secret; otherwise restore the card in an authentication-required state.
- Preserve XSRF, origin, trusted-downstream, TLS redirect, and host-key policy behavior unless the task explicitly changes the security model.
- Put live, user-facing runtime limits such as `maxconn` and `maxupload` in the system-settings workflow. Keep listener, TLS, proxy-trust, origin, host-key, and other startup/security options CLI-only unless authenticated administration and restart semantics are explicitly designed.
- Keep Chinese and English UI text in sync. Update accessible labels and dynamic text as well as visible labels.
- When changing terminal or group state, check browser persistence, drag/resize behavior, fullscreen behavior, restore behavior, and cleanup.

## Implement by Surface

For backend changes, add or update focused tests first when practical. Cover invalid input, ownership, resource cleanup, and the HTTP/WebSocket boundary. Avoid blocking the Tornado IOLoop with SSH work; existing SSH connection setup runs in `IndexHandler.executor`.

For frontend changes, follow the existing plain JavaScript and DOM-helper style unless a framework migration is explicitly requested. Keep state transitions centralized through existing helpers and preserve stable terminal/card dimensions. For layout or responsive changes, give the user xterm fitting and browser inspection steps covering 375px, 768px, 1024px, and 1440px; do not perform those checks yourself.

For broad redesigns or migrations, establish the replacement boundary and migration sequence before editing. Do not silently maintain two architectures. Record intentional compatibility behavior and remove only code made obsolete by the requested change.

## Hand Off for User Acceptance

After implementation, summarize the changed behavior, affected files, known limitations, and how the user can exercise and verify the result. The user owns all verification and product acceptance; do not perform verification even when preparing the handoff.

Leave the implementation uncommitted and unpushed while acceptance is pending. Wait for an explicit user instruction such as "验收通过" or "可以推送" before publishing it. A request to inspect, explain, or revise the result is not approval to commit or push.

## Publish Accepted Updates with Git

After the user explicitly accepts the update:

1. Re-read `git status`, the complete task diff, and the configured branch/upstream. Update this skill and the project map when required, then run `codegraph sync .` for source changes.
2. Stage only files that belong to the accepted update. Never include unrelated user changes, local IDE files, generated CodeGraph data, secrets, or incidental artifacts.
3. Inspect `git diff --cached` and confirm every staged line traces to the accepted task.
4. Create one focused, non-interactive commit whose subject starts with a change-type prefix. Use `fix:` for defect corrections, `add:` for new capabilities, `doc:` for documentation-only updates, or another accurate prefix such as `refactor:`, `test:`, or `chore:` when applicable.
5. Push the current branch with ordinary `git push` to its already configured upstream. Verify the resulting branch/upstream state and report the commit and push destination.

`git push` itself has no message field; the prefix belongs to the commit subject that will appear in the pushed history. Never force-push, push tags, change remotes, create a new upstream, or push to the repository named `upstream` unless the user explicitly requests that exact action. If no upstream is configured, the remote rejects the push, or authentication fails, do not work around the condition silently; stop the Git publishing step and report it. A newer user instruction to keep work local or not commit/push overrides this default.

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
