# Configurable SSH Connection Concurrency

## Goal

Make bulk terminal open and reconnect operations use a configurable SSH setup concurrency, with a default of 32, without coupling thread creation to the much larger per-client `maxconn` limit.

## Design

The backend will expose a new process-wide system setting, `connect_workers`, with an allowed range of 1–128 and a default of 32. It will be returned by and accepted by `/system-settings`, persisted in `system-settings.json`, and loaded compatibly when an older settings file does not contain the field.

SSH setup will continue to use the existing Worker → WebSocket contract. Single-terminal setup keeps the existing `/` POST. Bulk SSH-config opening, failed-group SSH reconnect, and secret-free pinned-group restoration use `/batch-connect`, which accepts one transient JSON request containing the connection descriptors and returns an aligned result list. The browser creates each returned WebSocket after the batch response through the batch scheduler, so SSH setup retains high concurrency without duplicating the per-terminal HTTP setup request.

`IndexHandler` and `BatchIndexHandler` share a bounded executor with at most 128 worker threads and a condition-based concurrency limiter. The limiter's active-task limit starts at `options.connect_workers` and is updated immediately when the system-settings POST succeeds. This prevents a large `maxconn` value from creating an equally large global thread pool while allowing the user to lower or raise setup concurrency within the safe range.

The existing SSH setup sequence remains unchanged inside each limited task: SSH connect, shell invocation, the existing encoding/shell detection channel, directory-tracking setup, and Worker registration. Worker cleanup and per-IP `maxconn` enforcement remain unchanged. Batch Workers use a pending-bind recycle grace of `max(options.delay, 30)` seconds so a large group of queued browser WebSocket handshakes cannot arrive after the Worker has already been recycled; single-terminal setup keeps its existing `options.delay` behavior. If a batch item has no Worker result, the browser retries that item once through the original `/` endpoint; if only the first WebSocket bind fails, it retries that same Worker once after a 2-second backoff instead of creating a duplicate. Successful batch items are never repeated. A WebSocket that was already opened is not automatically retried after a later normal disconnect.

The existing system-settings modal will gain a labeled numeric input, “SSH 建连并发数” / “SSH connection concurrency”, with min 1, max 128, and default 32. The value will be loaded from the backend, stored in the existing browser settings record, submitted with the other global runtime settings, and kept synchronized in both Chinese and English UI text.

## Compatibility and error handling

- Existing `system-settings.json` files containing only `maxconn` and `maxupload` remain valid and use the default/current concurrency value.
- Invalid `connect_workers` values are rejected with HTTP 400 and do not mutate the active settings.
- The browser clamps user input to 1–128 before submission; the backend remains authoritative.
- The new limiter always releases its slot in a `finally` path, including SSH connection failures.
- Batch results stay aligned with their input order and carry per-terminal failures without discarding successful Workers.
- A failed batch item gets one single-connection fallback attempt, while a first WebSocket bind failure gets one same-Worker bind attempt; deterministic failures still surface after that attempt.
- Batch credentials and uploaded private-key text are request-scoped only; they are not persisted by the batch protocol.
- No password, private key body, passphrase, or TOTP value is added to persistence.

## Acceptance points

- Bulk opening and group reconnect can use up to 32 simultaneous SSH setup tasks by default.
- Bulk opening and group reconnect use one batch HTTP request and then bind each returned Worker through its own `/ws?id=...` socket.
- Changing the setting in the system-settings modal affects subsequent SSH setup tasks without restarting the process.
- A large `maxconn` value does not create more than 128 setup threads.
- Old settings files still load, while newly saved settings include `connect_workers`.
- Existing HTTP/WebSocket session and Worker lifecycle contracts remain intact.
