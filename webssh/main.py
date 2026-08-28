import logging
import os
import tornado.web
import tornado.ioloop

from tornado.options import options
from webssh import handler
from webssh.handler import (
    IndexHandler, BatchIndexHandler, SSHConfigHandler, SystemSettingsHandler,
    ActiveWorkersHandler, LocalTerminalHandler, UploadHandler, WsockHandler,
    NotFoundHandler
)
from webssh.settings import (
    get_app_settings, get_host_keys_settings, get_policy_setting,
    get_ssl_context, get_server_settings, check_encoding_setting,
    load_system_settings
)


def make_handlers(loop, options):
    host_keys_settings = get_host_keys_settings(options)
    policy = get_policy_setting(options, host_keys_settings)

    handlers = [
        (r'/', IndexHandler, dict(loop=loop, policy=policy,
                                  host_keys_settings=host_keys_settings)),
        (r'/batch-connect', BatchIndexHandler, dict(
            loop=loop, policy=policy, host_keys_settings=host_keys_settings
        )),
        (r'/ssh-config', SSHConfigHandler),
        (r'/system-settings', SystemSettingsHandler),
        (r'/active-workers', ActiveWorkersHandler),
        (r'/local-terminal', LocalTerminalHandler, dict(loop=loop)),
        (r'/upload', UploadHandler, dict(loop=loop)),
        (r'/ws', WsockHandler, dict(loop=loop)),
        (r'/(service-worker\.js)', tornado.web.StaticFileHandler, dict(
            path=os.path.join(os.path.dirname(__file__), 'static')
        ))
    ]
    return handlers


def make_app(handlers, settings):
    settings.update(default_handler_class=NotFoundHandler)
    return tornado.web.Application(handlers, **settings)


def app_listen(app, port, address, server_settings):
    app.listen(port, address, **server_settings)
    if not server_settings.get('ssl_options'):
        server_type = 'http'
    else:
        server_type = 'https'
        handler.redirecting = True if options.redirect else False
    logging.info(
        'Listening on {}:{} ({})'.format(address, port, server_type)
    )


def main():
    options.parse_command_line()
    check_encoding_setting(options.encoding)
    load_system_settings()
    loop = tornado.ioloop.IOLoop.current()
    app = make_app(make_handlers(loop, options), get_app_settings(options))
    ssl_ctx = get_ssl_context(options)
    server_settings = get_server_settings(options)
    app_listen(app, options.port, options.address, server_settings)
    if ssl_ctx:
        server_settings.update(ssl_options=ssl_ctx)
        app_listen(app, options.sslport, options.ssladdress, server_settings)
    loop.start()


if __name__ == '__main__':
    main()
