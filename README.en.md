<div align="center">

# TermFleet-SSH

**Multiple hosts. One workspace.**

Manage SSH connections in your browser, broadcast commands by group, and upload files to one terminal or an entire group.

![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square)
![Self-hosted](https://img.shields.io/badge/Deployment-Self--hosted-0F766E?style=flat-square)
[![MIT License](https://img.shields.io/badge/License-MIT-64748B?style=flat-square)](LICENSE)

[Quick start](#quick-start) · [User guide (中文)](docs/usage.md) · [Report an issue](https://github.com/tianyin231/TermFleet-SSH/issues)

[简体中文](README.md) · **English**

</div>

---

TermFleet-SSH is a self-hosted Web SSH workspace for operating multiple hosts. Organize terminals by environment, switch between side-by-side views and a focused terminal, and send repeated operations to an explicit set of connections.

## What it does

| Capability | In practice |
| --- | --- |
| **Dynamic groups** | Create, rename and reorder groups; move terminals between them and resize your layout. |
| **Workspace and focus modes** | View terminals side by side, or use grouped tabs to focus on one terminal with optional same-group input synchronization. |
| **Scoped broadcasting** | Send commands and control keys to all or selected terminals in a group, with per-group history and completion. |
| **SSH configuration discovery** | Read OpenSSH configuration on the server and open hosts in batches; connect with passwords, private keys, key passphrases or TOTP. |
| **Individual and group uploads** | Upload to one terminal or an entire group and review each destination path. Remote SSH uploads use SFTP. |
| **Workspace restoration** | Keep group layouts in the browser, reattach to surviving sessions after a page refresh, and recreate terminal windows in pinned groups. |

Also includes server-local terminals, light and dark themes, Chinese and English interfaces, configurable shortcuts and operation logs.

## Quick start

You need **Python 3.10+, Git and a modern browser**. The machine running TermFleet-SSH must be able to reach the target SSH hosts.

```bash
git clone https://github.com/tianyin231/TermFleet-SSH.git
cd TermFleet-SSH
python -m venv .venv
```

Activate the environment. On Linux / macOS, use `python3` above if `python` is unavailable.

| Environment | Command |
| --- | --- |
| Linux / macOS | `source .venv/bin/activate` |
| Windows PowerShell | `.\.venv\Scripts\Activate.ps1` |

```bash
python -m pip install .
wssh --address=127.0.0.1 --port=8888
```

Open **[http://127.0.0.1:8888](http://127.0.0.1:8888)** on the machine running the service. Add an SSH connection or open discovered hosts through the host manager.

> The distribution name and command still use the upstream names `webssh` and `wssh`. Install from this repository; `pip install webssh` is not a substitute.

## Before you connect

- **Check the broadcast scope.** Selected-only mode sends nothing when no terminals are selected. Group uploads target all connected terminals in the group, independently of broadcast selection.
- **Restored windows are not preserved sessions.** After a service restart, pinned groups recreate windows; SSH connections requiring sensitive credentials need reauthentication. Layouts and broadcast history are stored in the current browser.
- **Local means server-local.** The local terminal runs on the machine hosting TermFleet-SSH, not on the browser's machine. Do not expose the service directly to the public internet. Remote access should use access authentication, HTTPS and trusted SSH host-key verification.

Local terminals use PTY on Linux / macOS and ConPTY on Windows. Windows requires Windows 10 1809+ and can use CMD, Windows PowerShell or PowerShell 7 when installed.

## Documentation and feedback

The [user and deployment guide (中文)](docs/usage.md) covers connections, grouping, broadcasting, uploads, restoration, shortcuts and startup options. When opening an [issue](https://github.com/tianyin231/TermFleet-SSH/issues), include your operating system, Python version, reproduction steps and redacted logs. Never include credentials or private keys.

## License and credits

Extended from [huashengdun/webssh](https://github.com/huashengdun/webssh) and licensed under [MIT](LICENSE). Tornado and Paramiko power the backend; xterm.js provides the browser terminal. Thanks to the upstream project and its contributors.
