TermFleet-SSH
=============

TermFleet-SSH 是一个基于 Web 的 SSH 集群管理控制台，面向需要同时连接、分组、广播操作多台主机的场景。后端使用 Tornado、Paramiko 和 xterm.js，前端提供工作组、终端窗口、SSH 配置识别、本机终端、操作日志和中英文切换。

项目声明
--------

本项目基于原 WebSSH 项目改造，原项目地址：

https://github.com/huashengdun/webssh

主要功能
--------

- 多终端窗口管理，支持拖动、重命名、最大化、关闭和重新连接。
- 工作组管理，支持新建、删除、重命名、拖动排序、自由拉伸和工作组全屏。
- 工作组布局会自动利用可用空间，手动调整后的分组尺寸会被保留。
- 刷新页面后恢复仍在服务端存活的终端窗口。
- 持久化工作组名称、顺序、宽高比例、终端所属分组和终端窗口高度。
- 支持普通 SSH 表单连接、私钥文件、私钥口令、TOTP。
- 后端读取 OpenSSH 配置文件，默认读取 ``~/.ssh/config``。
- “已识别主机”支持填入、单台打开、勾选多台后批量打开到指定分组。
- 支持打开本机终端，不需要 SSH。
- 支持按工作组广播命令和常用组合键，例如 ``Ctrl+C``、``Ctrl+D``、``Ctrl+Z``、``Ctrl+L``、``Tab``、``Esc``。
- 终端标题区显示 WebSocket 延迟，并按延迟自动变色。
- 系统设置支持调整最多终端数、终端字号、默认终端高度、广播回车和断开确认。
- 操作日志以文本日志形式展示，入口位于右上角。
- 支持中文和英文界面切换。

环境要求
--------

- Python 3.10+
- 现代浏览器，例如 Chrome、Edge、Firefox、Safari
- 需要远程 SSH 时，服务端应能访问目标主机的 SSH 端口

安装
----

开发环境建议直接在项目目录安装依赖：

.. code:: bash

    python -m pip install -r requirements.txt

也可以按包方式安装：

.. code:: bash

    python -m pip install .

启动
----

默认监听 ``0.0.0.0:8888``：

.. code:: bash

    wssh

指定监听地址和端口：

.. code:: bash

    wssh --address='127.0.0.1' --port=8888

浏览器打开：

.. code::

    http://127.0.0.1:8888

常用启动参数
------------

.. code:: bash

    # 指定监听地址和端口
    wssh --address='127.0.0.1' --port=8888

    # 指定 HTTPS 证书
    wssh --certfile='/path/to/cert.crt' --keyfile='/path/to/cert.key'

    # 指定 SSH host key 策略：reject、autoadd、warning
    wssh --policy=reject

    # 指定已识别主机使用的 OpenSSH 配置文件
    wssh --sshconfig='~/.ssh/config'

    # 设置单个客户端最多同时连接的终端数
    wssh --maxconn=50

    # 指定默认字符编码
    wssh --encoding='utf-8'

    # 查看全部参数
    wssh --help

使用方式
--------

连接 SSH 主机
~~~~~~~~~~~~~

在左侧连接面板填写主机名、用户名、端口、密码或私钥文件，并选择目标工作组。点击“连接”后会在目标工作组中创建终端窗口。

使用 SSH 配置识别主机
~~~~~~~~~~~~~~~~~~~~~

程序会通过后端读取 OpenSSH 配置文件，默认路径为：

.. code::

    ~/.ssh/config

可以通过启动参数修改：

.. code:: bash

    wssh --sshconfig='/path/to/ssh_config'

识别出的主机会显示在“已识别主机”区域。每台主机可以填入、单台打开，也可以自定义勾选多台主机，点击“打开所选”后选择一个工作组批量打开。

桌面端直接点击即可逐台追加或取消选择，也兼容 ``Ctrl``（Windows/Linux）和 ``Command``（macOS）点击；使用 ``Shift`` 可在保留已有选择的同时连续选择一段主机。

出于安全考虑，前端不会读取或展示私钥内容。私钥路径由后端根据 SSH 配置读取和使用。

管理工作组
~~~~~~~~~~

顶部“新建分组”可以创建工作组。工作组支持重命名、拖动排序、右下角拖拽调整宽高、工作组全屏查看和删除。工作组名称、顺序和手动调整后的比例会保存到浏览器本地，刷新后恢复。

管理终端窗口
~~~~~~~~~~~~

每个终端窗口支持拖动到其他工作组、重命名、重新连接、最大化、关闭和手动调整终端高度。

刷新页面后，仍在服务端存活的会话会自动恢复。手动关闭窗口会真正断开对应 SSH 会话或本机终端进程。

广播命令
~~~~~~~~

每个工作组顶部都有广播输入框。输入命令并发送，会广播到该工作组内所有已连接终端。

组合键可以通过控制键下拉框发送，例如 ``Ctrl+C``、``Ctrl+D``、``Ctrl+Z``、``Ctrl+L``、``Tab``、``Esc``。

本机终端
~~~~~~~~

右上角“本机终端”会打开服务端本机 shell。它和 SSH 终端使用相同的窗口、分组、日志、重连和关闭逻辑。

网络延迟
~~~~~~~~

终端标题区会显示当前 WebSocket 延迟。低延迟为绿色，中等延迟为黄色，高延迟或离线为红色。

系统设置和日志
~~~~~~~~~~~~~~

左侧系统设置支持调整最多终端数、终端字号、终端默认高度、广播命令是否自动回车和断开全部前是否确认。

右上角“日志”会打开全屏操作日志。

Docker
------

启动：

.. code:: bash

    docker-compose up

停止：

.. code:: bash

    docker-compose down

Nginx 反向代理
--------------

WebSocket 需要透传 Upgrade 头：

.. code:: nginx

    location / {
        proxy_pass http://127.0.0.1:8888;
        proxy_http_version 1.1;
        proxy_read_timeout 300;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Real-PORT $remote_port;
    }

建议在生产环境启用 HTTPS，并使用 ``--policy=reject`` 配合可信 ``known_hosts``。

测试
----

.. code:: bash

    python -m unittest discover tests

或：

.. code:: bash

    python -m pytest tests
