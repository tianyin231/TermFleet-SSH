import io
import getpass
import json
import logging
import os
import pty
import socket
import struct
import subprocess
import tempfile
import threading
import traceback
import weakref
import paramiko
import tornado.gen
import tornado.web

from concurrent.futures import ThreadPoolExecutor
from tornado.ioloop import IOLoop
from tornado.options import options
from tornado.process import cpu_count
from webssh.utils import (
    is_valid_ip_address, is_valid_port, is_valid_hostname, to_bytes, to_str,
    to_int, to_ip_address, UnicodeType, is_ip_hostname, is_same_primary_domain,
    is_valid_encoding
)
from webssh.worker import (
    Worker, PTYChannel, LocalProcess, register_worker, clients
)
from webssh.settings import (
    DEFAULT_CONNECT_WORKERS, MAX_CONNECT_WORKERS, MIN_CONNECT_WORKERS,
    save_system_settings
)

try:
    from json.decoder import JSONDecodeError
except ImportError:
    JSONDecodeError = ValueError

try:
    from urllib.parse import urlparse
except ImportError:
    from urlparse import urlparse


DEFAULT_PORT = 22
HOST_PATTERN_CHARS = set('*?!')
BATCH_WORKER_GRACE = 30

swallow_http_errors = True
redirecting = None


class InvalidValueError(Exception):
    pass


class ConnectionLimiter(object):

    def __init__(self, limit):
        self._condition = threading.Condition()
        self._limit = limit
        self._active = 0

    def acquire(self):
        with self._condition:
            while self._active >= self._limit:
                self._condition.wait()
            self._active += 1

    def release(self):
        with self._condition:
            self._active -= 1
            self._condition.notify_all()

    def set_limit(self, limit):
        if not (MIN_CONNECT_WORKERS <= limit <= MAX_CONNECT_WORKERS):
            raise ValueError('Invalid connection concurrency limit')
        with self._condition:
            self._limit = limit
            self._condition.notify_all()


def get_ssh_config_path():
    return os.path.expanduser(getattr(options, 'sshconfig', '~/.ssh/config'))


def host_is_explicit(host):
    return host and not any(ch in host for ch in HOST_PATTERN_CHARS)


def get_default_ssh_user():
    return getpass.getuser()


def get_ssh_config():
    filename = get_ssh_config_path()
    config = paramiko.SSHConfig()
    if not os.path.isfile(filename):
        return config

    with open(filename) as f:
        config.parse(f)
    return config


def parse_ssh_config_hosts():
    config = get_ssh_config()
    hosts = []

    for host in sorted(config.get_hostnames()):
        if not host_is_explicit(host):
            continue
        data = config.lookup(host)
        hostname = data.get('hostname') or host
        port = to_int(data.get('port')) or DEFAULT_PORT
        if not (is_valid_hostname(hostname) or is_valid_ip_address(hostname)):
            continue
        if not is_valid_port(port):
            continue
        identityfiles = data.get('identityfile') or []
        hosts.append({
            'alias': host,
            'hostname': hostname,
            'username': data.get('user') or get_default_ssh_user(),
            'port': port,
            'has_identity_file': bool(identityfiles)
        })

    return hosts


class SSHClient(paramiko.SSHClient):

    def handler(self, title, instructions, prompt_list):
        answers = []
        for prompt_, _ in prompt_list:
            prompt = prompt_.strip().lower()
            if prompt.startswith('password'):
                answers.append(self.password)
            elif prompt.startswith('verification'):
                answers.append(self.totp)
            else:
                raise ValueError('Unknown prompt: {}'.format(prompt_))
        return answers

    def auth_interactive(self, username, handler):
        if not self.totp:
            raise ValueError('Need a verification code for 2fa.')
        self._transport.auth_interactive(username, handler)

    def _auth(self, username, password, pkey, *args):
        self.password = password
        saved_exception = None
        two_factor = False
        allowed_types = set()
        two_factor_types = {'keyboard-interactive', 'password'}

        if pkey is not None:
            logging.info('Trying publickey authentication')
            try:
                allowed_types = set(
                    self._transport.auth_publickey(username, pkey)
                )
                two_factor = allowed_types & two_factor_types
                if not two_factor:
                    return
            except paramiko.SSHException as e:
                saved_exception = e

        if two_factor:
            logging.info('Trying publickey 2fa')
            return self.auth_interactive(username, self.handler)

        if password is not None:
            logging.info('Trying password authentication')
            try:
                self._transport.auth_password(username, password)
                return
            except paramiko.SSHException as e:
                saved_exception = e
                allowed_types = set(getattr(e, 'allowed_types', []))
                two_factor = allowed_types & two_factor_types

        if two_factor:
            logging.info('Trying password 2fa')
            return self.auth_interactive(username, self.handler)

        assert saved_exception is not None
        raise saved_exception


class PrivateKey(object):

    max_length = 16384  # rough number

    tag_to_name = {
        'RSA': 'RSA',
        'DSA': 'DSS',
        'EC': 'ECDSA',
        'OPENSSH': 'Ed25519'
    }

    def __init__(self, privatekey, password=None, filename=''):
        self.privatekey = privatekey
        self.filename = filename
        self.password = password
        self.check_length()
        self.iostr = io.StringIO(privatekey)
        self.last_exception = None

    def check_length(self):
        if len(self.privatekey) > self.max_length:
            raise InvalidValueError('Invalid key length.')

    def parse_name(self, iostr, tag_to_name):
        name = None
        for line_ in iostr:
            line = line_.strip()
            if line and line.startswith('-----BEGIN ') and \
                    line.endswith(' PRIVATE KEY-----'):
                lst = line.split(' ')
                if len(lst) == 4:
                    tag = lst[1]
                    if tag:
                        name = tag_to_name.get(tag)
                        if name:
                            break
        return name, len(line_)

    def get_specific_pkey(self, name, offset, password):
        self.iostr.seek(offset)
        logging.debug('Reset offset to {}.'.format(offset))

        logging.debug('Try parsing it as {} type key'.format(name))
        pkeycls = getattr(paramiko, name+'Key')
        pkey = None

        try:
            pkey = pkeycls.from_private_key(self.iostr, password=password)
        except paramiko.PasswordRequiredException:
            raise InvalidValueError('Need a passphrase to decrypt the key.')
        except (paramiko.SSHException, ValueError) as exc:
            self.last_exception = exc
            logging.debug(str(exc))

        return pkey

    def get_pkey_obj(self):
        logging.info('Parsing private key {!r}'.format(self.filename))
        name, length = self.parse_name(self.iostr, self.tag_to_name)
        if not name:
            raise InvalidValueError('Invalid key {}.'.format(self.filename))

        offset = self.iostr.tell() - length
        password = to_bytes(self.password) if self.password else None
        pkey = self.get_specific_pkey(name, offset, password)

        if pkey is None and name == 'Ed25519':
            for name in ['RSA', 'ECDSA', 'DSS']:
                pkey = self.get_specific_pkey(name, offset, password)
                if pkey:
                    break

        if pkey:
            return pkey

        logging.error(str(self.last_exception))
        msg = 'Invalid key'
        if self.password:
            msg += ' or wrong passphrase "{}" for decrypting it.'.format(
                    self.password)
        raise InvalidValueError(msg)


class MixinHandler(object):

    custom_headers = {
        'Server': 'TornadoServer'
    }

    html = ('<html><head><title>{code} {reason}</title></head><body>{code} '
            '{reason}</body></html>')

    def initialize(self, loop=None):
        self.check_request()
        self.loop = loop
        self.origin_policy = self.settings.get('origin_policy')

    def check_request(self):
        context = self.request.connection.context
        result = self.is_forbidden(context, self.request.host_name)
        self._transforms = []
        if result:
            self.set_status(403)
            self.finish(
                self.html.format(code=self._status_code, reason=self._reason)
            )
        elif result is False:
            to_url = self.get_redirect_url(
                self.request.host_name, options.sslport, self.request.uri
            )
            self.redirect(to_url, permanent=True)
        else:
            self.context = context

    def check_origin(self, origin):
        if self.origin_policy == '*':
            return True

        parsed_origin = urlparse(origin)
        netloc = parsed_origin.netloc.lower()
        logging.debug('netloc: {}'.format(netloc))

        host = self.request.headers.get('Host')
        logging.debug('host: {}'.format(host))

        if netloc == host:
            return True

        if self.origin_policy == 'same':
            return False
        elif self.origin_policy == 'primary':
            return is_same_primary_domain(netloc.rsplit(':', 1)[0],
                                          host.rsplit(':', 1)[0])
        else:
            return origin in self.origin_policy

    def is_forbidden(self, context, hostname):
        ip = context.address[0]
        lst = context.trusted_downstream
        ip_address = None

        if lst and ip not in lst:
            logging.warning(
                'IP {!r} not found in trusted downstream {!r}'.format(ip, lst)
            )
            return True

        if context._orig_protocol == 'http':
            if redirecting and not is_ip_hostname(hostname):
                ip_address = to_ip_address(ip)
                if not ip_address.is_private:
                    # redirecting
                    return False

            if options.fbidhttp:
                if ip_address is None:
                    ip_address = to_ip_address(ip)
                if not ip_address.is_private:
                    logging.warning('Public plain http request is forbidden.')
                    return True

    def get_redirect_url(self, hostname, port, uri):
        port = '' if port == 443 else ':%s' % port
        return 'https://{}{}{}'.format(hostname, port, uri)

    def set_default_headers(self):
        for header in self.custom_headers.items():
            self.set_header(*header)

    def get_value(self, name):
        value = self.get_argument(name)
        if not value:
            raise InvalidValueError('Missing value {}'.format(name))
        return value

    def get_context_addr(self):
        return self.context.address[:2]

    def get_client_addr(self):
        if options.xheaders:
            return self.get_real_client_addr() or self.get_context_addr()
        else:
            return self.get_context_addr()

    def get_real_client_addr(self):
        ip = self.request.remote_ip

        if ip == self.request.headers.get('X-Real-Ip'):
            port = self.request.headers.get('X-Real-Port')
        elif ip in self.request.headers.get('X-Forwarded-For', ''):
            port = self.request.headers.get('X-Forwarded-Port')
        else:
            # not running behind an nginx server
            return

        port = to_int(port)
        if port is None or not is_valid_port(port):
            # fake port
            port = 65535

        return (ip, port)


class NotFoundHandler(MixinHandler, tornado.web.ErrorHandler):

    def initialize(self):
        super(NotFoundHandler, self).initialize()

    def prepare(self):
        raise tornado.web.HTTPError(404)


class SSHConfigHandler(MixinHandler, tornado.web.RequestHandler):

    def get(self):
        self.write({
            'path': get_ssh_config_path(),
            'hosts': parse_ssh_config_hosts()
        })


class SystemSettingsHandler(MixinHandler, tornado.web.RequestHandler):

    def get(self):
        self.write({
            'maxconn': options.maxconn,
            'maxupload': options.maxupload,
            'connect_workers': options.connect_workers
        })

    def post(self):
        maxconn = to_int(self.get_argument('maxconn', ''))
        maxupload = to_int(self.get_argument('maxupload', options.maxupload))
        connect_workers = to_int(
            self.get_argument('connect_workers', options.connect_workers)
        )
        if maxconn is None or maxconn < 1 or maxconn > 500:
            raise tornado.web.HTTPError(400, 'Invalid maxconn')
        if maxupload is None or maxupload < 1 or maxupload > 10240:
            raise tornado.web.HTTPError(400, 'Invalid maxupload')
        if (connect_workers is None or
                connect_workers < MIN_CONNECT_WORKERS or
                connect_workers > MAX_CONNECT_WORKERS):
            raise tornado.web.HTTPError(400, 'Invalid connect_workers')
        options.maxconn = maxconn
        options.maxupload = maxupload
        options.connect_workers = connect_workers
        IndexHandler.connection_limiter.set_limit(connect_workers)
        try:
            save_system_settings(maxconn, maxupload, connect_workers)
        except OSError:
            logging.error(
                'Failed to persist system settings', exc_info=True
            )
        self.write({
            'maxconn': options.maxconn,
            'maxupload': options.maxupload,
            'connect_workers': options.connect_workers
        })


class ActiveWorkersHandler(MixinHandler, tornado.web.RequestHandler):

    def get(self):
        ip, _ = self.get_client_addr()
        workers = clients.get(ip, {})
        self.write({'ids': [key for key, worker in workers.items() if worker]})


class LocalTerminalHandler(MixinHandler, tornado.web.RequestHandler):

    def initialize(self, loop):
        super(LocalTerminalHandler, self).initialize(loop)
        self.result = dict(id=None, status=None, encoding='utf-8')

    def post(self):
        ip, port = self.get_client_addr()
        if len(clients.get(ip, {})) >= options.maxconn:
            raise tornado.web.HTTPError(403, 'Too many live connections.')

        master, slave = pty.openpty()
        shell = os.environ.get('SHELL') or '/bin/sh'
        env = os.environ.copy()
        env.setdefault('TERM', self.get_argument('term', u'') or u'xterm-256color')
        proc = subprocess.Popen(
            [shell], stdin=slave, stdout=slave, stderr=slave,
            close_fds=True, env=env, preexec_fn=os.setsid
        )
        os.close(slave)
        worker = Worker(
            self.loop, LocalProcess(proc, os.getcwd()), PTYChannel(master),
            ('localhost', 0)
        )
        worker.enable_directory_tracking(os.path.basename(shell))
        worker.encoding = 'utf-8'
        register_worker(worker, clients, (ip, port))
        worker.schedule_recycle(options.delay)
        self.result.update(id=worker.id)
        self.write(self.result)


class IndexHandler(MixinHandler, tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(max_workers=MAX_CONNECT_WORKERS)
    connection_limiter = ConnectionLimiter(DEFAULT_CONNECT_WORKERS)

    def initialize(self, loop, policy, host_keys_settings):
        super(IndexHandler, self).initialize(loop)
        self.connection_limiter.set_limit(options.connect_workers)
        self.policy = policy
        self.host_keys_settings = host_keys_settings
        self.ssh_client = self.get_ssh_client()
        self.debug = self.settings.get('debug', False)
        self.font = self.settings.get('font', '')
        self.result = dict(id=None, status=None, encoding=None)

    def write_error(self, status_code, **kwargs):
        if swallow_http_errors and self.request.method == 'POST':
            exc_info = kwargs.get('exc_info')
            if exc_info:
                reason = getattr(exc_info[1], 'log_message', None)
                if reason:
                    self._reason = reason
            self.result.update(status=self._reason)
            self.set_status(200)
            self.finish(self.result)
        else:
            super(IndexHandler, self).write_error(status_code, **kwargs)

    def get_ssh_client(self):
        ssh = SSHClient()
        ssh._system_host_keys = self.host_keys_settings['system_host_keys']
        ssh._host_keys = self.host_keys_settings['host_keys']
        ssh._host_keys_filename = self.host_keys_settings['host_keys_filename']
        ssh.set_missing_host_key_policy(self.policy)
        return ssh

    def get_privatekey(self, values=None):
        if values is not None:
            return values.get('privatekey', u''), values.get(
                'privatekey_filename', u''
            )

        name = 'privatekey'
        lst = self.request.files.get(name)
        if lst:
            # multipart form
            filename = lst[0]['filename']
            data = lst[0]['body']
            value = self.decode_argument(data, name=name).strip()
        else:
            # urlencoded form
            value = self.get_argument(name, u'')
            filename = ''

        return value, filename

    def get_hostname(self):
        value = self.get_value('hostname')
        if not (is_valid_hostname(value) or is_valid_ip_address(value)):
            raise InvalidValueError('Invalid hostname: {}'.format(value))
        return value

    def get_port(self):
        value = self.get_argument('port', u'')
        if not value:
            return DEFAULT_PORT

        port = to_int(value)
        if port is None or not is_valid_port(port):
            raise InvalidValueError('Invalid port: {}'.format(value))
        return port

    def parse_port_value(self, value):
        if not value:
            return DEFAULT_PORT

        port = to_int(value)
        if port is None or not is_valid_port(port):
            raise InvalidValueError('Invalid port: {}'.format(value))
        return port

    def get_ssh_config_data(self, alias):
        if not host_is_explicit(alias):
            raise InvalidValueError('Invalid SSH config host: {}'.format(alias))

        config = get_ssh_config()
        if alias not in config.get_hostnames():
            raise InvalidValueError('Unknown SSH config host: {}'.format(alias))

        return config.lookup(alias)

    def get_identityfile_privatekey(self, identityfiles):
        for filename in identityfiles or []:
            filename = os.path.expanduser(os.path.expandvars(filename))
            if os.path.isfile(filename):
                with open(filename) as f:
                    return f.read(), filename
        return '', ''

    def lookup_hostname(self, hostname, port, ssh_client=None):
        ssh_client = ssh_client or self.ssh_client
        key = hostname if port == 22 else '[{}]:{}'.format(hostname, port)

        if ssh_client._system_host_keys.lookup(key) is None:
            if ssh_client._host_keys.lookup(key) is None:
                raise tornado.web.HTTPError(
                        403, 'Connection to {}:{} is not allowed.'.format(
                            hostname, port)
                    )

    def get_args(self, values=None):
        def get_value(name, default=u''):
            if values is None:
                return self.get_argument(name, default)
            return values.get(name, default)

        ssh_client = self.ssh_client if values is None else self.get_ssh_client()
        ssh_config_host = get_value('ssh_config_host')
        if ssh_config_host:
            config = self.get_ssh_config_data(ssh_config_host)
            hostname = get_value('hostname') or \
                config.get('hostname') or ssh_config_host
            username = get_value('username') or \
                config.get('user') or get_default_ssh_user()
            port = self.parse_port_value(
                get_value('port') or config.get('port', u'')
            )
        else:
            config = {}
            if values is None:
                hostname = self.get_hostname()
                port = self.get_port()
                username = self.get_value('username')
            else:
                hostname = get_value('hostname')
                port = self.parse_port_value(get_value('port'))
                username = get_value('username')
                if not (is_valid_hostname(hostname) or
                        is_valid_ip_address(hostname)):
                    raise InvalidValueError(
                        'Invalid hostname: {}'.format(hostname)
                    )
                if not username:
                    raise InvalidValueError('Missing value username')

        if not username:
            raise InvalidValueError('Missing value username')
        if not (is_valid_hostname(hostname) or is_valid_ip_address(hostname)):
            raise InvalidValueError('Invalid hostname: {}'.format(hostname))

        password = get_value('password')
        privatekey, filename = self.get_privatekey(values)
        passphrase = get_value('passphrase')
        totp = get_value('totp')

        if not privatekey:
            privatekey, filename = self.get_identityfile_privatekey(
                config.get('identityfile')
            )

        if isinstance(self.policy, paramiko.RejectPolicy):
            self.lookup_hostname(hostname, port, ssh_client)

        if privatekey:
            pkey = PrivateKey(privatekey, passphrase, filename).get_pkey_obj()
        else:
            pkey = None

        ssh_client.totp = totp
        args = (hostname, port, username, password, pkey)
        logging.debug(
            'SSH connection args prepared for %s:%s as %s',
            hostname, port, username
        )

        term = get_value('term') or u'xterm'
        return args, ssh_client, term

    def parse_encoding(self, data):
        try:
            encoding = to_str(data.strip(), 'ascii')
        except UnicodeDecodeError:
            return

        if is_valid_encoding(encoding):
            return encoding

    def get_default_encoding(self, ssh, shell_state=None):
        commands = [
            "$SHELL -ilc 'printf \"\\036%s\\036\" \"$SHELL\"; locale charmap; printf \"\\036\"'",
            "$SHELL -ic 'printf \"\\036%s\\036\" \"$SHELL\"; locale charmap; printf \"\\036\"'"
        ]
        if shell_state is None:
            shell_state = {}
        shell_state['default_shell'] = ''

        for command in commands:
            try:
                _, stdout, _ = ssh.exec_command(command,
                                                get_pty=True,
                                                timeout=1)
            except paramiko.SSHException as exc:
                logging.info(str(exc))
            else:
                try:
                    data = stdout.read()
                except socket.timeout:
                    pass
                else:
                    logging.debug('{!r} => {!r}'.format(command, data))
                    first = data.find(b'\x1e')
                    second = data.find(b'\x1e', first + 1)
                    third = data.find(b'\x1e', second + 1)
                    if first >= 0 and second > first and third > second:
                        shell_path = data[first + 1:second]
                        shell = shell_path.rsplit(b'/', 1)[-1].decode(
                            'ascii', 'ignore'
                        ).lower()
                        if shell in ('bash', 'zsh', 'fish'):
                            shell_state['default_shell'] = shell
                        data = data[second + 1:third]
                    result = self.parse_encoding(data)
                    if result:
                        self.default_shell = shell_state['default_shell']
                        return result

        logging.warning('Could not detect the default encoding.')
        self.default_shell = shell_state['default_shell']
        return 'utf-8'

    def ssh_connect(self, connection):
        args, ssh, term = connection
        dst_addr = args[:2]
        logging.info('Connecting to {}:{}'.format(*dst_addr))

        try:
            ssh.connect(*args, timeout=options.timeout)
        except socket.error:
            raise ValueError('Unable to connect to {}:{}'.format(*dst_addr))
        except paramiko.BadAuthenticationType:
            raise ValueError('Bad authentication type.')
        except paramiko.AuthenticationException:
            raise ValueError('Authentication failed.')
        except paramiko.BadHostKeyException:
            raise ValueError('Bad host key.')

        chan = ssh.invoke_shell(term=term)
        worker = Worker(self.loop, ssh, chan, dst_addr)
        shell_state = {}
        detected_encoding = self.get_default_encoding(ssh, shell_state)
        worker.enable_directory_tracking(shell_state['default_shell'])
        chan.setblocking(0)
        worker.encoding = options.encoding if options.encoding else detected_encoding
        return worker

    def check_origin(self):
        event_origin = self.get_argument('_origin', u'')
        header_origin = self.request.headers.get('Origin')
        origin = event_origin or header_origin

        if origin:
            if not super(IndexHandler, self).check_origin(origin):
                raise tornado.web.HTTPError(
                    403, 'Cross origin operation is not allowed.'
                )

            if not event_origin and self.origin_policy != 'same':
                self.set_header('Access-Control-Allow-Origin', origin)

    def head(self):
        pass

    def get(self):
        self.render('index.html', debug=self.debug, font=self.font)

    @tornado.gen.coroutine
    def post(self):
        if self.debug and self.get_argument('error', u''):
            # for testing purpose only
            raise ValueError('Uncaught exception')

        ip, port = self.get_client_addr()
        if len(clients.get(ip, {})) >= options.maxconn:
            raise tornado.web.HTTPError(403, 'Too many live connections.')

        self.check_origin()

        try:
            connection = self.get_args()
        except InvalidValueError as exc:
            raise tornado.web.HTTPError(400, str(exc))

        future = self.executor.submit(self.limited_ssh_connect, connection)

        try:
            worker = yield future
        except (ValueError, paramiko.SSHException) as exc:
            logging.error(traceback.format_exc())
            self.result.update(status=str(exc))
        else:
            workers = register_worker(worker, clients, (ip, port))
            if len(workers) > options.maxconn:
                worker.close(reason='connection limit exceeded')
                raise tornado.web.HTTPError(
                    403, 'Too many live connections.'
                )
            worker.schedule_recycle(options.delay)
            self.result.update(id=worker.id, encoding=worker.encoding)

        self.write(self.result)

    def limited_ssh_connect(self, connection):
        self.connection_limiter.acquire()
        try:
            return self.ssh_connect(connection)
        finally:
            self.connection_limiter.release()


class BatchIndexHandler(IndexHandler):

    @tornado.gen.coroutine
    def post(self):
        ip, port = self.get_client_addr()
        if len(clients.get(ip, {})) >= options.maxconn:
            raise tornado.web.HTTPError(403, 'Too many live connections.')

        self.check_origin()
        try:
            payload = json.loads(to_str(self.request.body))
        except (TypeError, ValueError):
            raise tornado.web.HTTPError(400, 'Invalid batch request.')

        connections = payload.get('connections') if isinstance(payload, dict) else None
        if not isinstance(connections, list) or not connections:
            raise tornado.web.HTTPError(400, 'Missing connections.')

        futures = []
        results = [dict(id=None, status=None, encoding=None)
                   for _ in connections]
        for index, values in enumerate(connections):
            if not isinstance(values, dict):
                results[index]['status'] = 'Invalid connection data.'
                continue
            try:
                connection = self.get_args(values)
            except tornado.web.HTTPError as exc:
                results[index]['status'] = exc.log_message or str(exc)
                continue
            except InvalidValueError as exc:
                results[index]['status'] = str(exc)
                continue
            futures.append((index, self.executor.submit(
                self.safe_limited_ssh_connect, connection
            )))

        completed = []
        for index, future in futures:
            completed.append((index, (yield future)))

        for index, (worker, error) in completed:
            if error:
                results[index]['status'] = error
                continue
            workers = register_worker(worker, clients, (ip, port))
            if len(workers) > options.maxconn:
                worker.close(reason='connection limit exceeded')
                results[index]['status'] = 'Too many live connections.'
                continue
            # A large batch can take longer than the browser's queued WebSocket
            # handshakes. Keep the worker alive while its initial socket binds.
            worker.schedule_recycle(max(options.delay, BATCH_WORKER_GRACE))
            results[index].update(id=worker.id, encoding=worker.encoding)

        self.write({'results': results})

    def safe_limited_ssh_connect(self, connection):
        try:
            return self.limited_ssh_connect(connection), None
        except Exception as exc:
            logging.error(traceback.format_exc())
            try:
                connection[1].close()
            except Exception:
                pass
            return None, str(exc)


@tornado.web.stream_request_body
class UploadHandler(MixinHandler, tornado.web.RequestHandler):

    executor = ThreadPoolExecutor(max_workers=cpu_count()*2)

    def initialize(self, loop):
        super(UploadHandler, self).initialize(loop)
        self.worker = None
        self.filename = None
        self.upload_file = None
        self.upload_path = None
        self.received_size = 0

    def get_worker(self):
        ip, _ = self.get_client_addr()
        worker = clients.get(ip, {}).get(self.get_value('id'))
        if not worker or worker.closed:
            raise tornado.web.HTTPError(404, 'Terminal session not found.')
        return worker

    def prepare(self):
        if self.request.method != 'POST':
            return
        self.worker = self.get_worker()
        self.filename = self.get_value('filename')
        if (self.filename in ('.', '..') or '/' in self.filename or
                '\\' in self.filename or '\x00' in self.filename or
                len(self.filename) > 255):
            raise tornado.web.HTTPError(400, 'Invalid filename.')
        content_length = to_int(self.request.headers.get('Content-Length'))
        max_size = options.maxupload * 1024 * 1024
        self.request.connection.set_max_body_size(max_size)
        if content_length is not None and content_length > max_size:
            raise tornado.web.HTTPError(413, 'File exceeds upload limit.')
        upload_file = tempfile.NamedTemporaryFile(
            prefix='wssh-upload-', delete=False
        )
        self.upload_file = upload_file
        self.upload_path = upload_file.name

    def data_received(self, chunk):
        if not self.upload_file:
            return
        self.received_size += len(chunk)
        if self.received_size > options.maxupload * 1024 * 1024:
            self.cleanup_upload()
            raise tornado.web.HTTPError(413, 'File exceeds upload limit.')
        self.upload_file.write(chunk)

    @tornado.gen.coroutine
    def get(self):
        worker = self.get_worker()
        try:
            path = yield self.executor.submit(worker.get_upload_directory)
        except (IOError, OSError, paramiko.SSHException, ValueError) as exc:
            raise tornado.web.HTTPError(400, str(exc))
        self.write({
            'path': path,
            'tracked': bool(worker.current_directory),
            'local': isinstance(worker.ssh, LocalProcess)
        })

    @tornado.gen.coroutine
    def post(self):
        if self.upload_file:
            self.upload_file.close()
            self.upload_file = None
        directory = self.get_argument('path', '')
        overwrite = self.get_argument('overwrite', '0') == '1'
        try:
            destination = yield self.executor.submit(
                self.worker.upload_file, self.upload_path, self.filename,
                directory, overwrite
            )
        except FileExistsError:
            raise tornado.web.HTTPError(409, 'A file with this name already exists.')
        except (IOError, OSError, paramiko.SSHException, ValueError) as exc:
            raise tornado.web.HTTPError(400, str(exc))
        finally:
            self.cleanup_upload()
        self.write({'path': destination, 'size': self.received_size})

    def cleanup_upload(self):
        if self.upload_file:
            self.upload_file.close()
            self.upload_file = None
        if self.upload_path:
            try:
                os.unlink(self.upload_path)
            except OSError:
                pass
            self.upload_path = None

    def on_connection_close(self):
        self.cleanup_upload()
        super(UploadHandler, self).on_connection_close()

    def write_error(self, status_code, **kwargs):
        self.cleanup_upload()
        reason = self._reason
        exc_info = kwargs.get('exc_info')
        if exc_info and getattr(exc_info[1], 'log_message', None):
            reason = exc_info[1].log_message
        self.finish({'status': reason})


class WsockHandler(MixinHandler, tornado.websocket.WebSocketHandler):

    def initialize(self, loop):
        super(WsockHandler, self).initialize(loop)
        self.worker_ref = None

    def open(self):
        self.src_addr = self.get_client_addr()
        logging.info('Connected from {}:{}'.format(*self.src_addr))

        workers = clients.get(self.src_addr[0])
        if not workers:
            self.close(reason='Websocket authentication failed.')
            return

        try:
            worker_id = self.get_value('id')
        except (tornado.web.MissingArgumentError, InvalidValueError) as exc:
            self.close(reason=str(exc))
        else:
            worker = workers.get(worker_id)
            if worker:
                self.set_nodelay(True)
                worker.detach_handler()
                worker.set_handler(self)
                self.worker_ref = weakref.ref(worker)
                self.loop.add_handler(worker.fd, worker, IOLoop.READ)
            else:
                self.close(reason='Websocket authentication failed.')

    def on_message(self, message):
        logging.debug('{!r} from {}:{}'.format(message, *self.src_addr))
        worker = self.worker_ref()
        if not worker:
            # The worker has likely been closed. Do not process.
            logging.debug(
                "received message to closed worker from {}:{}".format(
                    *self.src_addr
                )
            )
            self.close(reason='No worker found')
            return

        if worker.closed:
            self.close(reason='Worker closed')
            return

        try:
            msg = json.loads(message)
        except JSONDecodeError:
            return

        if not isinstance(msg, dict):
            return

        ping = msg.get('ping')
        if ping is not None:
            self.write_message(json.dumps({'pong': ping}))
            return

        cwd = msg.get('cwd')
        if cwd and isinstance(cwd, UnicodeType):
            worker.set_current_directory(cwd)

        resize = msg.get('resize')
        if resize and len(resize) == 2:
            try:
                worker.chan.resize_pty(*resize)
            except (TypeError, struct.error, paramiko.SSHException):
                pass

        data = msg.get('data')
        if data and isinstance(data, UnicodeType):
            worker.data_to_dst.append(data)
            worker.on_write()

    def on_close(self):
        logging.info('Disconnected from {}:{}'.format(*self.src_addr))
        if not self.close_reason:
            self.close_reason = 'client disconnected'

        worker = self.worker_ref() if self.worker_ref else None
        if worker:
            manual_reasons = {
                'closed', 'closed by user', 'user closed', '用户关闭',
                '已关闭'
            }
            if worker.handler is not self:
                return
            if self.close_reason in manual_reasons:
                worker.close(reason=self.close_reason)
            else:
                worker.detach_handler(self)
                worker.schedule_recycle(max(options.delay, 30))
