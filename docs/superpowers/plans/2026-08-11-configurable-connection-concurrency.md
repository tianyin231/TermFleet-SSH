# Configurable SSH Connection Concurrency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted, frontend-configurable SSH setup concurrency with a default of 32 and a hard maximum of 128.

**Architecture:** Keep the existing per-terminal HTTP POST followed by WebSocket binding for single connections. Add `/batch-connect` for bulk SSH-config opening and failed-group SSH reconnect so one request starts all setup tasks, then the browser binds each returned Worker through its own WebSocket. Back both paths with a condition-based limiter and bounded 128-worker executor, and expose the limiter setting through the existing `/system-settings` persistence and modal UI.

**Tech Stack:** Python 3.10+, Tornado, Paramiko, `concurrent.futures`, plain HTML/CSS/JavaScript, unittest/Tornado tests.

## Global Constraints

- Preserve the two-stage session flow: create a worker over HTTP, then bind `/ws?id=<worker-id>`.
- Preserve the existing shell/encoding detection sequence and Worker cleanup semantics.
- Keep `maxconn` as the per-client live-session limit; do not size the global thread pool directly from it.
- Use the existing system-settings JSON and modal; do not add a new persistence mechanism.
- The project skill requires the user to run verification; the agent will add/update tests but will not execute tests, linters, syntax checks, builds, or servers.
- Keep `.idea/` untracked user data untouched.

### Task 1: Add backend setting and concurrency limiter

**Files:**
- Modify: `webssh/settings.py`
- Modify: `webssh/handler.py`
- Test: `tests/test_handler.py`
- Test: `tests/test_app.py`

**Interfaces:**
- `webssh.settings` provides `DEFAULT_CONNECT_WORKERS = 32`, `MIN_CONNECT_WORKERS = 1`, `MAX_CONNECT_WORKERS = 128`, and the `options.connect_workers` option.
- `webssh.handler.ConnectionLimiter` provides `acquire()`, `release()`, and `set_limit(limit)` for setup-task slots.
- `IndexHandler` submits SSH setup through the limiter while retaining its existing executor submission and response contract.

- [ ] **Step 1: Add failing tests for the setting contract.**

  Extend `TestSystemSettingsPersistence` so a POST containing `connect_workers=48` returns and persists `connect_workers: 48`; add coverage that a value outside 1–128 is rejected; add coverage that an old two-field settings file loads while retaining the default 32.

- [ ] **Step 2: Add failing tests for limiter behavior.**

  In `tests/test_handler.py`, add a focused test using two worker threads and a limiter of 1. Hold the first task after acquisition, assert the second task cannot enter until the first releases, then release and assert both tasks finish. Add a test that `set_limit(2)` allows a waiting task to proceed.

- [ ] **Step 3: Implement the setting constants and persistence.**

  Register `options.connect_workers` with default 32. Extend `save_system_settings` and `load_system_settings` with the new field, accepting old files without it and rejecting invalid values. Keep the existing maxconn/maxupload validation and logging behavior.

- [ ] **Step 4: Implement the bounded setup executor and runtime update.**

  Add a condition-based limiter in `webssh/handler.py`, use a maximum 128-worker executor for `IndexHandler`, wrap only `ssh_connect` execution with `acquire`/`release`, synchronize the limiter from `options.connect_workers` when an IndexHandler is initialized, and update it from `SystemSettingsHandler.post` after validation. Return `connect_workers` from GET/POST.

- [ ] **Step 5: Review the backend diff without running verification.**

  Confirm the limiter release is in `finally`, the old settings shape remains loadable, the executor never exceeds 128 workers, and no HTTP/WebSocket or Worker lifecycle code was changed beyond the concurrency gate.

### Task 2: Add the frontend system-setting control

**Files:**
- Modify: `webssh/templates/index.html`
- Modify: `webssh/static/js/main.js`

**Interfaces:**
- The modal input is `#setting-connection-concurrency`.
- The browser settings record uses `connectionConcurrency`, synchronized with backend JSON/form field `connect_workers`.

- [ ] **Step 1: Add the labeled accessible input.**

  Add a numeric setting row beside the existing terminal limits, with `for`/`id`, min `1`, max `128`, default `32`, and Chinese/English `data-i18n` text.

- [ ] **Step 2: Add synchronized browser state.**

  Add `connectionConcurrency: 32` to local settings defaults, load `data.connect_workers`, populate the control, clamp the changed value to 1–128, and submit it as `connect_workers` in the existing system-settings request. Register the input in the existing change listener list.

- [ ] **Step 3: Add bilingual copy and preserve existing UI behavior.**

  Add matching Chinese and English labels/help text if needed, keep the current modal layout and keyboard/focus behavior, and avoid introducing new icons, frameworks, or layout systems.

- [ ] **Step 4: Review the frontend diff without running verification.**

  Confirm the field is keyboard-labelable, visible in both languages, uses the existing settings save path, and does not change terminal palette or unrelated settings.

### Task 3: Update repository map and acceptance handoff

**Files:**
- Modify: `.agents/skills/maintain-termfleet-ssh/references/project-map.md`
- Review: `docs/superpowers/specs/2026-08-11-configurable-connection-concurrency-design.md`
- Review: `docs/superpowers/plans/2026-08-11-configurable-connection-concurrency.md`

- [ ] **Step 1: Document the new runtime setting and JSON field.**

  Update the project map's HTTP system-settings contract, browser/system-setting description, and verification gaps or coverage notes to mention `connect_workers` and its 1–128 range.

- [ ] **Step 2: Self-review the complete change.**

  Check for stale names, missing bilingual text, accidental `.idea/` staging, secret persistence, and contradictions between the design, plan, project map, and source.

- [ ] **Step 3: Hand off user-run verification.**

  Ask the user to run:

  ```bash
  node --check webssh/static/js/main.js
  .venv/bin/python -m unittest discover tests
  ```

    Ask the user to verify: default 32 after a fresh start; changing the value to 1 and 32 in System Settings; opening/reconnecting a group larger than the configured concurrency; rejecting 0 and 129; and loading an old `system-settings.json` without `connect_workers`.

### Task 4: Batch the bulk SSH request boundary

**Files:**
- Modify: `webssh/handler.py`
- Modify: `webssh/main.py`
- Modify: `webssh/static/js/main.js`
- Test: `tests/test_app.py`

- [x] Add `/batch-connect` with aligned per-item results and reuse the existing SSH setup sequence, limiter, Worker registration, `maxconn` enforcement, and recycle scheduling.
- [x] Route SSH-config bulk opening, failed-group SSH reconnect, and secret-free pinned-group restoration through the batch endpoint while leaving local-terminal and single-terminal flows unchanged.
- [x] Serialize an uploaded private key only for the request, retain bilingual UI state, and keep the existing per-Worker WebSocket contract.
- [x] Retry failed batch items once through the original single-connection endpoint so transient failures retain the faster bulk path without repeatedly reconnecting successful items.
- [x] Retry a first WebSocket bind once on the already-created Worker, avoiding duplicate Worker creation and avoiding an artificial `maxconn` hit.
- [ ] Have the user run the focused batch test and browser waterfall scenarios; the agent does not run verification in this repository.
