# TermFleet-SSH Project Map

Verified against the repository on 2026-07-20. Re-check affected facts against source before relying on them.

## Product Scope

TermFleet-SSH is a browser-based SSH fleet workspace derived from WebSSH. It supports:

- multiple xterm.js terminal cards grouped in horizontally resizable, reorderable work groups;
- a browser-persisted day/night workspace theme toggle that changes non-terminal surfaces while preserving the terminal and xterm palette;
- layered top-toolbar and connection-sidebar controls that can auto-collapse into small overlay cues or remain persistently expanded through a saved customizable cross-platform shortcut, plus a shared connection form that can move into a modal from the left cue or Ctrl/Command+Shift+C;
- SSH password, uploaded private key, private-key passphrase, and TOTP authentication;
- a top-right host manager opened by button or Ctrl/Command+Shift+H, with compact group switching, creation, and quick deletion, SSH-config hosts on the left, current-group terminals plus reconnect/maximize/close controls on the right, alias-first terminal titles, click-to-toggle multi-select, and additive Shift range selection;
- a top-right system-settings modal for terminal and connection preferences plus conflict-checked, cross-platform shortcut bindings for common toolbar actions;
- server-local shell sessions through a PTY;
- whole-group or browser-persisted selected-terminal command and control-key broadcast, controlled by a per-group All/Selected segmented control and customizable Ctrl/Command+Alt/Option+S shortcut, with preserved multiline input that grows from one to roughly four lines before scrolling (Enter sends, Shift+Enter inserts a newline), persisted group scope and terminal selections, empty-submit Enter without history, explicit card/count/input scope feedback, zero-selection blocking, fixed-slot scrolling history above the input, 30+ labeled read-only Linux candidates below it, Tab completion, and single-line Up/Down transitions through the original-draft gap between the two candidate regions;
- single-terminal and per-group file upload, with group uploads following the same persisted All/Selected terminal scope as broadcasts, plus per-terminal destination review, non-persistent Bash/Zsh/Fish OSC 7 current-directory hooks, home-directory fallback, progress, cancellation, zero-selection blocking, and explicit overwrite consent;
- terminal rename, reconnect, move, resize, maximize, close, and latency display;
- group create, rename, reorder, horizontal resize, fullscreen, delete, pinning, failed-terminal-only batch reconnect, and layout persistence, with a repeating full-height half-screen plus two vertically stacked quarter-area groups and half-viewport paging;
- restoration of server workers that survive a browser refresh;
- browser-local pinned-group snapshots that recreate terminal cards after a backend restart, automatically reconnecting local or secret-free SSH descriptors and routing descriptors that used secrets through a dedicated authentication modal to reconnect the original card;
- local settings, operation logs, and Chinese/English UI.

This is a single-process application. There is no database, account system, durable server-side session store, frontend build step, or component framework.

## Runtime Shape

```text
Browser single-page workspace
  |-- HTTP GET / -----------------------> render index.html
  |-- HTTP POST / ----------------------> create Paramiko SSH Worker
  |-- HTTP POST /local-terminal --------> create PTY-backed local Worker
  |-- HTTP GET /ssh-config -------------> discover OpenSSH aliases
  |-- HTTP GET/POST /system-settings ---> read/change process-wide runtime limits
  |-- HTTP GET /active-workers ---------> list live worker IDs for client IP
  |-- HTTP GET/POST /upload ------------> resolve target/upload raw file to Worker
  `-- WebSocket /ws?id=<worker-id> <----> bind xterm input/output to Worker

Worker -> Paramiko Channel -> remote SSH server
Worker -> PTYChannel -> server-local shell process
```

`webssh.main:main` is exposed as the `wssh` console command. `run.py` is the Docker entry point. Tornado listens on port 8888 by default.

## Source Ownership

| Path | Responsibility |
| --- | --- |
| `webssh/main.py` | Application construction, route registration, HTTP/HTTPS listeners |
| `webssh/handler.py` | HTTP/WebSocket handlers, request/security checks, streamed upload staging, SSH config parsing, authentication, SSH and local-worker creation |
| `webssh/worker.py` | Live worker registry, channel I/O, SFTP/local file writes, handler rebinding, cleanup, local process and PTY adapters |
| `webssh/settings.py` | Tornado CLI options, app/server/TLS/origin/font/host-key settings |
| `webssh/policy.py` | Paramiko missing-host-key policies and thread-safe auto-add behavior |
| `webssh/utils.py` | Encoding, address, hostname, origin, and domain helpers |
| `webssh/templates/index.html` | Entire page markup and application CSS |
| `webssh/static/js/main.js` | Entire client application: state, rendering, transport, persistence, i18n, drag/resize, logs |
| `tests/sshserver.py` | In-process Paramiko SSH test server |
| `tests/test_app.py` | Main HTTP, SSH-authentication, WebSocket, policy, origin, size, and encoding integration coverage |
| `tests/test_handler.py` | Handler helpers, private keys, origin/client address, SSH config, WebSocket edge cases |
| `tests/test_worker.py` | Worker registry identity, idempotent cleanup, close failures, and generation-guarded recycle behavior |
| `tests/test_settings.py`, `test_policy.py`, `test_utils.py`, `test_main.py` | Focused backend unit coverage |

## Repository Tooling

- `AGENTS.md` is mandatory task guidance: state assumptions, choose the simplest sufficient approach, keep edits surgical, and define verifiable success criteria.
- `.agents/skills/ui-ux-pro-max/` provides a searchable design database and required design-system workflow for UI/UX work. Its generic output must be reconciled with this operational workspace and plain HTML/CSS/JavaScript stack.
- CodeGraph 1.4.1 is installed locally. Its generated index lives under `.codegraph/` and can be queried through MCP or the `codegraph` CLI.
- MCP configuration exists in `.mcp.json`, `.cursor/mcp.json`, and `opencode.jsonc`; `.claude/settings.json` allows the CodeGraph MCP methods. A given client session may still lack the MCP tools, in which case use the CLI.
- Use CodeGraph for symbol discovery, source-plus-call-path exploration, callers/callees, impact analysis, and affected-test suggestions. Verify its output with `rg` and source reads: after the current index rebuild, `impact WsockHandler` found relevant handler tests, while `affected webssh/handler.py` still reported no affected tests.
- Run `codegraph sync .` after source changes. Rebuild with `codegraph index .` when an older index schema causes query failures; the generated database is ignored by `.codegraph/.gitignore`.
- All test, lint, build, syntax, server, browser, and functional verification is user-run. The agent may recommend commands and scenarios but must not execute them, start a service for verification, or claim that behavior was verified.

## Git Topology

- The working branch is `master`, configured to track `origin/master`.
- `origin` is the TermFleet-SSH repository: `https://github.com/tianyin231/TermFleet-SSH.git` for fetch and push.
- `upstream` is the original WebSSH repository: `https://github.com/huashengdun/webssh.git` for fetch and push.
- Normal project publishing uses the current branch's configured upstream, currently `origin/master`. Never push to the remote named `upstream` unless the user explicitly requests it.
- Updates are committed and pushed only after explicit user acceptance, scoped staging, and staged-diff review. Commit subjects use an accurate type prefix such as `fix:`, `add:`, or `doc:`. Never force-push or include unrelated dirty/untracked files.

## External Contracts

### HTTP

| Route | Method | Contract |
| --- | --- | --- |
| `/` | GET | Render the workspace |
| `/` | POST | Accept SSH form fields, create a Worker with supported temporary directory tracking, and return `{id, status, encoding}`; handled errors intentionally return HTTP 200 with `status` |
| `/ssh-config` | GET | Return `{path, hosts}`; hosts contain alias, hostname, username, port, and `has_identity_file` only |
| `/system-settings` | GET | Return process-wide `{maxconn, maxupload}` |
| `/system-settings` | POST | Validate `maxconn` in 1..500 and `maxupload` in 1..10240 MiB, then mutate both running process options |
| `/active-workers` | GET | Return live worker IDs for the resolved client IP as `{ids}` |
| `/local-terminal` | POST | Create the server user's shell PTY, install supported temporary directory tracking, and return `{id, status, encoding}` |
| `/upload?id=...` | GET | Resolve the Worker upload directory as `{path, tracked, local}`; uses OSC 7 state or the SSH home/local startup directory fallback |
| `/upload?id=...&filename=...&path=...&overwrite=...` | POST | Stream a raw file body into the Worker's absolute target directory; default maximum is 100 MiB and overwrite requires `overwrite=1` |
| `/ws?id=...` | WebSocket | Attach the socket to an existing worker owned by the same resolved client IP |

SSH form fields are `hostname`, `username`, `port`, `password`, `privatekey`, `passphrase`, `totp`, `term`, and optional `ssh_config_host`. `target_group` is client-only routing metadata.

### WebSocket

Client text frames are JSON objects:

- `{data: string}` queues terminal input for the channel;
- `{resize: [cols, rows]}` resizes the SSH or local PTY;
- `{ping: value}` requests `{pong: value}` for UI latency measurement.
- `{cwd: absolute-path}` records an OSC 7 working-directory update for upload targeting.

Server terminal output is sent as binary frames. A newly bound socket replaces any old handler for the worker. Do not convert terminal output to JSON without migrating the decoder and tests.

## Session Lifecycle

1. The browser posts SSH credentials to `/` or requests `/local-terminal`.
2. The backend creates a `Worker`, detects encoding and supported shell type through one existing exec channel, installs directory tracking in the interactive PTY when supported, registers the Worker in the canonical `clients[client_ip]` map after asynchronous setup, rechecks `maxconn`, and schedules an owned early-recycle timeout if no WebSocket binds.
3. The browser opens `/ws?id=<worker_id>`. The worker cancels its pending recycle timeout, binds the handler, and registers its channel fd with Tornado's IOLoop.
4. The browser sends JSON input/resize/ping; the worker sends binary terminal output.
5. A manual WebSocket close reason cancels recycling and closes the worker, channel, SSH/local process, and identity-matched registry entry; transport close errors do not skip the remaining cleanup.
6. An incidental disconnect detaches the handler and replaces any older recycle timeout with a generation-guarded timeout after `max(options.delay, 30)` seconds.
7. On page load, the browser intersects saved `wssh-sessions` with `/active-workers`, recreates cards, and rebinds surviving workers.
8. The browser then fills any missing cards from pinned snapshots in `wssh-groups`. Local terminals and SSH descriptors that require no stored secret create new workers automatically; other SSH cards stop in an authentication-required state.

Each Worker tracks one recycle timeout. Cancellation advances its generation so even an already-queued stale callback cannot close a later binding or detached interval. Concurrent SSH completions always register into the current canonical per-IP map, and a post-connect `maxconn` check closes only the excess Worker without replacing existing registry entries.

Worker rebinding is short-lived, per process, and keyed by client IP; the workers themselves do not survive a server restart. Pinned groups add a separate browser-local, declarative restore path that creates replacement workers after restart when no saved secret is needed. A reconnect creates a new backend worker, and saved reconnect metadata excludes credentials and private-key data, so password, TOTP, uploaded-key, and passphrase sessions require re-authentication.

## Browser State

`main.js` owns these local-storage keys:

| Key | Contents |
| --- | --- |
| `wssh-language` | `zh` or `en` |
| `wssh-theme` | explicit `light` or `dark` workspace theme; terminal colors are not theme-dependent |
| `wssh-settings` | disconnect confirmation, broadcast Enter, terminal font size/height, max terminals, persistent panel mode, and customizable toolbar shortcut bindings |
| `wssh-operation-logs` | capped client-side operation log records |
| `wssh-broadcast-history` | up to 100 deduplicated broadcast commands per group for local candidates and Up/Down navigation; removed with the group |
| `wssh-groups` | group IDs, names, order, `stacked-v1` layout marker, grid spans, manual-size flag, pin state, broadcast scope, and sanitized pinned-terminal snapshots; older layout records reset to the new default spans on restore |
| `wssh-sessions` | worker ID, stable browser session ID, display metadata, group, height, local flag, last OSC 7 directory, broadcast selection, safe auto-reconnect flag, and sanitized reconnect metadata |

All browser state is JSON serialized by `localStorage`. Pinned snapshots never include passwords, TOTP values, uploaded private-key content, or passphrases. They are intentionally browser-local because the application has no accounts or authenticated ownership boundary; a server-side JSON workspace would otherwise be shared across users.

The client-side maximum-terminal and upload-size settings are synchronized to process-wide backend `options.maxconn` and `options.maxupload`. They are not scoped to a user or browser. Startup and security parameters remain CLI-only because the web UI has no authenticated administrative boundary or restart workflow.

## Security and Ownership Invariants

- Mixin handlers enforce trusted-downstream/public-HTTP behavior and origin policy.
- XSRF cookies are enabled by default; JavaScript includes `_xsrf` for form-style POSTs.
- Host-key behavior is selected by `--policy`; reject mode requires known hosts, while auto-add writes the configured host file.
- OpenSSH config private-key paths are read only by the backend. The discovery response exposes only a boolean.
- Private-key upload length is capped and parsed through Paramiko.
- `clients` is keyed only by resolved client IP. Clients sharing an IP can list the same worker IDs through `/active-workers`; a caller that knows an ID can bind `/ws` and detach the previous handler. Treat this as an ownership/isolation limitation, not authenticated session isolation.
- `/local-terminal` grants a shell as the web server OS user. Treat exposure and authorization changes as security-sensitive.
- `/upload` uses the same client-IP/worker-ID ownership boundary as WebSocket attachment. It stages request bodies in temporary files, cleans them after success/failure/disconnect, rejects non-absolute target directories and unsafe filenames, and does not overwrite unless explicitly requested.
- `/system-settings` mutates global runtime state. There is currently no user authentication or role check.

## Verification and Current Gaps

Preferred user-run commands (the agent must not execute them):

```bash
node --check webssh/static/js/main.js
.venv/bin/python -m unittest discover tests
```

On 2026-07-20, JS syntax passed. The local `.venv` used Python 3.9 even though the project requires Python 3.10+, and it did not contain pytest. Its unittest baseline ran 102 tests with 1 failure and 2 errors: the wrong-port case returned Paramiko `No existing session`, and the two oversized-request tests raised client-side `ConnectionResetError` or `BrokenPipeError`. A clean Python 3.13 environment with the pinned requirements previously reproduced the same three failures. Update this note when the baseline changes; do not attribute these failures to later work without reproducing them before the change.

Coverage is strongest for inherited SSH authentication, request validation, policies, origins, encoding, and basic WebSocket I/O. Coverage is weak or absent for:

- `/ssh-config`, `/system-settings`, `/active-workers`, `/local-terminal`, and `/upload` end-to-end behavior;
- local-process cleanup and PTY lifecycle;
- full refresh restoration and worker rebinding;
- repeated real-browser detach/rebind sequences beyond the generation-guard unit coverage;
- client persistence schema and migrations;
- group/card drag, resize, fullscreen, reconnect, broadcast, latency, i18n, logs, and responsive layout;
- authorization implications of local shells and global settings;
- multiple app processes or multiple users behind one IP.

Add focused tests around the changed behavior instead of relying only on the inherited backend suite, then ask the user to run them. Give the user real-browser verification steps for frontend and lifecycle changes; the agent must not perform those checks.

## Deployment

- Python requirement in project docs: 3.10+.
- Runtime dependencies are pinned in `requirements.txt`: Paramiko 3.5.1 and Tornado 6.5.1. `setup.py` permits much older versions (`paramiko>=2.3.1`, `tornado>=4.5.0`), so dependency-compatibility changes must check both installation paths.
- `--maxupload` sets the per-file upload limit in MiB and defaults to 100. The upload route raises its own streaming body limit without changing the 1 MiB limit on other requests.
- `Dockerfile` uses `python:3-alpine`, installs dependencies, creates an unprivileged `webssh` user with `/bin/false`, and runs `python run.py`.
- `docker-compose.yml` builds the repository and publishes port 8888.
- Reverse proxies must forward WebSocket Upgrade headers. Correct `xheaders` and `trusted_downstream` settings are part of client ownership and security.
