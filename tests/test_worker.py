import unittest

from webssh.worker import (
    Worker, clear_worker, clients, register_worker
)

try:
    from unittest.mock import Mock
except ImportError:
    from mock import Mock


class TestWorkerRegistry(unittest.TestCase):

    def setUp(self):
        clients.clear()

    def tearDown(self):
        clients.clear()

    def test_register_workers_uses_one_client_registry(self):
        first = Mock(id='first')
        second = Mock(id='second')

        first_workers = register_worker(
            first, clients, ('127.0.0.1', 1001)
        )
        second_workers = register_worker(
            second, clients, ('127.0.0.1', 1002)
        )

        self.assertIs(first_workers, second_workers)
        self.assertEqual(set(first_workers), {'first', 'second'})

    def test_clear_worker_ignores_missing_or_replaced_worker(self):
        original = Mock(id='worker')
        replacement = Mock(id='worker')
        register_worker(original, clients, ('127.0.0.1', 1001))
        replacement.src_addr = original.src_addr
        clients['127.0.0.1']['worker'] = replacement

        self.assertFalse(clear_worker(original, clients))
        self.assertIs(clients['127.0.0.1']['worker'], replacement)
        self.assertTrue(clear_worker(replacement, clients))
        self.assertNotIn('127.0.0.1', clients)


class TestWorkerRecycle(unittest.TestCase):

    def setUp(self):
        clients.clear()
        self.scheduled = []
        self.loop = Mock()

        def call_later(delay, callback, *args):
            handle = Mock()
            self.scheduled.append((handle, callback, args))
            return handle

        self.loop.call_later.side_effect = call_later
        self.ssh = Mock()
        self.chan = Mock()
        self.chan.fileno.return_value = 7
        self.worker = Worker(
            self.loop, self.ssh, self.chan, ('example.com', 22)
        )
        register_worker(
            self.worker, clients, ('127.0.0.1', 1001)
        )

    def tearDown(self):
        if not self.worker.closed:
            self.worker.close(reason='test cleanup')
        clients.clear()

    def test_rebinding_invalidates_old_recycle_callback(self):
        self.worker.schedule_recycle(3)
        old_handle, old_callback, old_args = self.scheduled[-1]

        handler = Mock()
        self.worker.set_handler(handler)
        self.worker.detach_handler(handler)
        self.worker.schedule_recycle(30)

        old_callback(*old_args)

        self.loop.remove_timeout.assert_any_call(old_handle)
        self.assertFalse(self.worker.closed)
        self.assertIs(
            clients['127.0.0.1'][self.worker.id], self.worker
        )

    def test_current_recycle_callback_closes_detached_worker(self):
        self.worker.schedule_recycle(3)
        _, callback, args = self.scheduled[-1]

        callback(*args)

        self.assertTrue(self.worker.closed)
        self.chan.close.assert_called_once_with()
        self.ssh.close.assert_called_once_with()
        self.assertNotIn('127.0.0.1', clients)

    def test_close_errors_do_not_skip_registry_cleanup(self):
        self.chan.close.side_effect = EOFError()
        self.ssh.close.side_effect = OSError()

        self.worker.close(reason='test cleanup failure')

        self.assertTrue(self.worker.closed)
        self.chan.close.assert_called_once_with()
        self.ssh.close.assert_called_once_with()
        self.assertNotIn('127.0.0.1', clients)


if __name__ == '__main__':
    unittest.main()
