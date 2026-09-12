TermFleet-SSH
=============

Multiple hosts. One workspace.

TermFleet-SSH is a self-hosted Web SSH workspace with dynamic terminal groups,
scoped command broadcasting and individual or group file uploads.

Features
--------

* Organize SSH terminals into movable, resizable workgroups.
* Switch between side-by-side workspace and single-terminal focus modes.
* Broadcast commands and control keys to all or selected terminals in a group.
* Discover hosts from the server's OpenSSH configuration.
* Upload files through SFTP and review each destination path.
* Restore browser layouts and recreate terminal windows in pinned groups.
* Use server-local terminals, configurable shortcuts, themes and a bilingual UI.

Install from this repository
----------------------------

Requires Python 3.10+ and a modern browser. Use a Python virtual environment.
After activating it, run:

.. code-block:: bash

    git clone https://github.com/tianyin231/TermFleet-SSH.git
    cd TermFleet-SSH
    python -m pip install .
    wssh --address=127.0.0.1 --port=8888

Open http://127.0.0.1:8888 on the machine running the service.
The distribution name and command remain ``webssh`` and ``wssh``;
``pip install webssh`` is not a substitute for installing this repository.

Usage boundaries
----------------

Group uploads target all connected terminals in the group, independently of
broadcast selection. Restoring windows does not preserve sessions across a
service restart; connections requiring sensitive credentials need reauthentication.
The local terminal runs on the server, not on the browser's machine.
Do not expose the service directly to the public internet. Configure access
authentication, HTTPS and trusted SSH host-key verification for remote access.

Documentation and credits
-------------------------

* `Project and Chinese introduction <https://github.com/tianyin231/TermFleet-SSH>`_
* `English introduction <https://github.com/tianyin231/TermFleet-SSH/blob/master/README.en.md>`_
* `User and deployment guide (Chinese) <https://github.com/tianyin231/TermFleet-SSH/blob/master/docs/usage.md>`_
* `Issue tracker <https://github.com/tianyin231/TermFleet-SSH/issues>`_

Extended from `huashengdun/webssh <https://github.com/huashengdun/webssh>`_.
Licensed under MIT; see the LICENSE file. Tornado and Paramiko power the backend,
and xterm.js provides the browser terminal.
