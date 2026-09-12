<div align="center">

# TermFleet-SSH

**多台主机，一个工作区。**

在浏览器中管理 SSH 连接，按组广播命令，向单机或整组上传文件。

![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square)
![Self-hosted](https://img.shields.io/badge/部署-自托管-0F766E?style=flat-square)
[![MIT License](https://img.shields.io/badge/License-MIT-64748B?style=flat-square)](LICENSE)

[快速开始](#快速开始) · [使用与部署指南](docs/usage.md) · [反馈问题](https://github.com/tianyin231/TermFleet-SSH/issues)

**简体中文** · [English](README.en.md)

</div>

---

TermFleet-SSH 是面向多主机操作的 Web SSH 工作台。把不同环境的终端放进各自的工作组，在并排查看与单终端聚焦之间切换，需要重复执行的操作则按明确范围同步发送。

## 核心能力

| 能力 | 你可以做什么 |
| --- | --- |
| **动态分组** | 创建、重命名、排序工作组，跨组拖动终端，调整窗口大小与布局。 |
| **两种工作模式** | 工作台中并排查看多个终端；聚焦模式通过分组标签切换主终端，并可开启同组输入同步。 |
| **范围可控的广播** | 向全组或组内选定终端发送命令与组合键，配合分组独立的历史和补全。 |
| **SSH 配置接入** | 读取服务端的 OpenSSH 配置，批量打开主机；支持密码、私钥、私钥口令与 TOTP。 |
| **单机与分组上传** | 向单个终端或整组上传文件，逐台确认目标目录；SSH 上传通过 SFTP 完成。 |
| **工作区恢复** | 保存浏览器内的分组布局；刷新后重新接入仍存活的会话，固定分组可重建终端窗口。 |

另有服务端本机终端、明暗主题、中英文界面、自定义快捷键和操作日志。连接信息与恢复行为见[使用指南](docs/usage.md)。

## 快速开始

准备 **Python 3.10+、Git 和现代浏览器**。运行 TermFleet-SSH 的机器需要能访问目标 SSH 主机。

```bash
git clone https://github.com/tianyin231/TermFleet-SSH.git
cd TermFleet-SSH
python -m venv .venv
```

激活虚拟环境（Linux / macOS 未提供 `python` 命令时，上一步使用 `python3`）：

| 环境 | 命令 |
| --- | --- |
| Linux / macOS | `source .venv/bin/activate` |
| Windows PowerShell | `.\.venv\Scripts\Activate.ps1` |

```bash
python -m pip install .
wssh --address=127.0.0.1 --port=8888
```

在运行服务的机器上打开 **[http://127.0.0.1:8888](http://127.0.0.1:8888)**，添加 SSH 连接或从主机管理器导入已识别的主机。

> 当前安装包名和启动命令沿用上游的 `webssh` / `wssh`。请从本仓库安装；`pip install webssh` 不能替代上述步骤。

## 使用前须知

- **广播前确认范围。** “已选”模式没有选中终端时不会发送；分组上传始终面向该组已连接终端，不受广播范围影响。
- **恢复窗口不等于保留会话。** 服务重启后，固定分组重建的是窗口；需要密码等敏感凭据的 SSH 连接必须重新认证。布局与广播历史保存在当前浏览器中。
- **本机终端运行在服务端。** 它不是浏览器所在电脑的 shell。请勿将服务直接暴露公网；远程访问应配置入口认证、HTTPS 和可信 SSH 主机密钥校验。

Linux / macOS 本机终端使用 PTY；Windows 使用 ConPTY，需要 Windows 10 1809+，可按安装情况选择 CMD、Windows PowerShell 或 PowerShell 7。

## 文档与反馈

[使用与部署指南](docs/usage.md)涵盖连接、分组、广播、上传、会话恢复、快捷键及启动参数。提交 [Issue](https://github.com/tianyin231/TermFleet-SSH/issues) 时，请附操作系统、Python 版本、复现步骤与脱敏日志，不要上传凭据或私钥。

## 开源与致谢

基于 [huashengdun/webssh](https://github.com/huashengdun/webssh) 扩展，采用 [MIT 许可证](LICENSE)。后端使用 Tornado 与 Paramiko，浏览器终端由 xterm.js 提供。感谢上游项目及其贡献者。
