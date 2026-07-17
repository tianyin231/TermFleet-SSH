import logging
import os
import posixpath
import shutil
import signal
try:
    import secrets
except ImportError:
    secrets = None
import tornado.websocket

from uuid import uuid4
from tornado.ioloop import IOLoop
from tornado.iostream import _ERRNO_CONNRESET
from tornado.util import errno_from_exception


BUF_SIZE = 32 * 1024
clients = {}  # {ip: {id: worker}}

SHELL_DIRECTORY_COMMANDS = {
    'bash': (
        "__termfleet_ssh_report_cwd(){ printf '\\033]7;file://%s%s\\007' "
        "\"${HOSTNAME:-localhost}\" \"$PWD\"; }; "
        "PROMPT_COMMAND=\"__termfleet_ssh_report_cwd${PROMPT_COMMAND:+;$PROMPT_COMMAND}\"; "
        "__termfleet_ssh_report_cwd"
    ),
    'zsh': (
        "function __termfleet_ssh_report_cwd(){ printf '\\033]7;file://%s%s\\007' "
        "\"${HOST:-localhost}\" \"$PWD\"; }; "
        "autoload -Uz add-zsh-hook; add-zsh-hook precmd __termfleet_ssh_report_cwd; "
        "__termfleet_ssh_report_cwd"
    ),
    'fish': (
        "function __termfleet_ssh_report_cwd --on-event fish_prompt; "
        "printf '\\e]7;file://%s%s\\a' (hostname) $PWD; end; "
        "__termfleet_ssh_report_cwd"
    )
}
SHELL_DIRECTORY_READY = b'\x1b]1337;TermFleetShellReady\x07'


def clear_worker(worker, clients):
    ip = worker.src_addr[0]
    workers = clients.get(ip)
    assert worker.id in workers
    workers.pop(worker.id)

    if not workers:
        clients.pop(ip)
        if not clients:
            clients.clear()


def recycle_worker(worker):
    if worker.handler:
        return
    logging.warning('Recycling worker {}'.format(worker.id))
    worker.close(reason='worker recycled')


class Worker(object):
    def __init__(self, loop, ssh, chan, dst_addr):
        self.loop = loop
        self.ssh = ssh
        self.chan = chan
        self.dst_addr = dst_addr
        self.fd = chan.fileno()
        self.id = self.gen_id()
        self.data_to_dst = []
        self.handler = None
        self.mode = IOLoop.READ
        self.closed = False
        self.current_directory = None
        self.startup_input = None
        self.startup_output = b''

    def __call__(self, fd, events):
        if events & IOLoop.READ:
            self.on_read()
        if events & IOLoop.WRITE:
            self.on_write()
        if events & IOLoop.ERROR:
            self.close(reason='error event occurred')

    @classmethod
    def gen_id(cls):
        return secrets.token_urlsafe(nbytes=32) if secrets else uuid4().hex

    def set_handler(self, handler):
        self.handler = handler
        if self.startup_input:
            self.loop.call_later(2, self.flush_startup_output)

    def set_current_directory(self, path):
        if isinstance(path, str) and path.startswith('/') and '\x00' not in path and len(path) <= 4096:
            self.current_directory = path

    def get_upload_directory(self):
        if self.closed:
            raise ValueError('Worker is closed.')
        if self.current_directory:
            return self.current_directory
        if isinstance(self.ssh, LocalProcess):
            return self.ssh.cwd
        sftp = self.ssh.open_sftp()
        try:
            return sftp.normalize('.')
        finally:
            sftp.close()

    def enable_directory_tracking(self, shell):
        setup = SHELL_DIRECTORY_COMMANDS.get(shell)
        if not setup:
            return
        command = " printf '\\033]1337;TermFleetShellReady\\007'; {}\r".format(setup)
        self.startup_input = command.rstrip('\r').encode('utf-8')
        data = command
        while data:
            sent = self.chan.send(data)
            if not sent:
                break
            data = data[sent:]

    def filter_startup_output(self, data):
        if not self.startup_input:
            return data
        self.startup_output += data
        marker_at = self.startup_output.find(SHELL_DIRECTORY_READY)
        if marker_at < 0:
            if len(self.startup_output) <= 64 * 1024:
                return b''
            data = self.startup_output
        else:
            data = self.startup_output[:marker_at] + self.startup_output[
                marker_at + len(SHELL_DIRECTORY_READY):
            ]

        return self.finish_startup_output(data)

    def finish_startup_output(self, data):
        command_at = data.rfind(self.startup_input)
        if command_at >= 0:
            line_start = max(
                data.rfind(b'\r', 0, command_at),
                data.rfind(b'\n', 0, command_at)
            ) + 1
            line_end = command_at + len(self.startup_input)
            if data[line_end:line_end + 2] == b'\r\n':
                line_end += 2
            elif data[line_end:line_end + 1] in (b'\r', b'\n'):
                line_end += 1
            data = data[:line_start] + data[line_end:]

        self.startup_input = None
        self.startup_output = b''
        return data

    def flush_startup_output(self):
        if not self.startup_input or not self.handler:
            return
        data = self.finish_startup_output(self.startup_output)
        if data:
            try:
                self.handler.write_message(data, binary=True)
            except tornado.websocket.WebSocketClosedError:
                pass

    def upload_file(self, local_path, filename, directory, overwrite=False):
        if self.closed:
            raise ValueError('Worker is closed.')
        directory = directory or self.get_upload_directory()
        if not directory.startswith('/'):
            raise ValueError('Upload directory must be an absolute path.')

        if isinstance(self.ssh, LocalProcess):
            if not os.path.isdir(directory):
                raise ValueError('Upload directory does not exist.')
            destination = os.path.join(directory, filename)
            if os.path.lexists(destination) and not overwrite:
                raise FileExistsError(destination)
            shutil.copyfile(local_path, destination)
            return destination

        sftp = self.ssh.open_sftp()
        try:
            destination = posixpath.join(directory, filename)
            if not overwrite:
                try:
                    sftp.lstat(destination)
                except IOError:
                    pass
                else:
                    raise FileExistsError(destination)
            sftp.put(local_path, destination)
            return destination
        finally:
            sftp.close()

    def detach_handler(self, handler=None):
        if handler is not None and handler is not self.handler:
            return
        if self.handler:
            try:
                self.loop.remove_handler(self.fd)
            except Exception:
                pass
            self.handler = None
            self.mode = IOLoop.READ

    def update_handler(self, mode):
        if self.mode != mode:
            self.loop.update_handler(self.fd, mode)
            self.mode = mode
        if mode == IOLoop.WRITE:
            self.loop.call_later(0.1, self, self.fd, IOLoop.WRITE)

    def on_read(self):
        logging.debug('worker {} on read'.format(self.id))
        try:
            raw_data = self.chan.recv(BUF_SIZE)
        except (OSError, IOError) as e:
            logging.error(e)
            if self.chan.closed or errno_from_exception(e) in _ERRNO_CONNRESET:
                self.close(reason='chan error on reading')
        else:
            logging.debug('{!r} from {}:{}'.format(raw_data, *self.dst_addr))
            if not raw_data:
                self.close(reason='chan closed')
                return
            data = self.filter_startup_output(raw_data)
            if not data:
                return

            logging.debug('{!r} to {}:{}'.format(data, *self.handler.src_addr))
            try:
                self.handler.write_message(data, binary=True)
            except tornado.websocket.WebSocketClosedError:
                self.close(reason='websocket closed')

    def on_write(self):
        logging.debug('worker {} on write'.format(self.id))
        if not self.data_to_dst:
            return

        data = ''.join(self.data_to_dst)
        logging.debug('{!r} to {}:{}'.format(data, *self.dst_addr))

        try:
            sent = self.chan.send(data)
        except (OSError, IOError) as e:
            logging.error(e)
            if self.chan.closed or errno_from_exception(e) in _ERRNO_CONNRESET:
                self.close(reason='chan error on writing')
            else:
                self.update_handler(IOLoop.WRITE)
        else:
            self.data_to_dst = []
            data = data[sent:]
            if data:
                self.data_to_dst.append(data)
                self.update_handler(IOLoop.WRITE)
            else:
                self.update_handler(IOLoop.READ)

    def close(self, reason=None):
        if self.closed:
            return
        self.closed = True

        logging.info(
            'Closing worker {} with reason: {}'.format(self.id, reason)
        )
        if self.handler:
            self.loop.remove_handler(self.fd)
            self.handler.close(reason=reason)
        self.chan.close()
        self.ssh.close()
        logging.info('Connection to {}:{} lost'.format(*self.dst_addr))

        clear_worker(self, clients)
        logging.debug(clients)


class LocalProcess(object):
    def __init__(self, proc, cwd=None):
        self.proc = proc
        self.cwd = cwd or os.getcwd()

    def close(self):
        if self.proc.poll() is None:
            try:
                os.killpg(os.getpgid(self.proc.pid), signal.SIGHUP)
            except OSError:
                pass


class PTYChannel(object):
    closed = False

    def __init__(self, fd):
        self.fd = fd

    def fileno(self):
        return self.fd

    def recv(self, size):
        try:
            return os.read(self.fd, size)
        except OSError:
            self.closed = True
            raise

    def send(self, data):
        if isinstance(data, str):
            data = data.encode()
        try:
            return os.write(self.fd, data)
        except OSError:
            self.closed = True
            raise

    def resize_pty(self, cols, rows):
        import fcntl
        import struct
        import termios
        data = struct.pack('HHHH', int(rows), int(cols), 0, 0)
        fcntl.ioctl(self.fd, termios.TIOCSWINSZ, data)

    def close(self):
        self.closed = True
        try:
            os.close(self.fd)
        except OSError:
            pass
