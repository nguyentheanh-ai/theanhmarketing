"""Exercise a staging-only payment transaction model with fake orders."""

import concurrent.futures
import pathlib
import sqlite3
import tempfile
import unittest


SCHEMA = pathlib.Path(__file__).with_name("d1-payment-idempotency-prototype.sql").read_text()
ACTIONS = (
    "student_access", "payment_email", "accounting_email",
    "meta_purchase", "telegram", "sheet_sync",
)


def connect(path):
    db = sqlite3.connect(path, timeout=5, isolation_level=None)
    db.execute("PRAGMA foreign_keys = ON")
    db.execute("PRAGMA busy_timeout = 5000")
    return db


def accept_webhook(path, transaction_id, order_code, amount_vnd, fail_before_commit=False):
    """Model the DB transition only; external delivery belongs to a later outbox worker."""
    db = connect(path)
    try:
        db.execute("BEGIN IMMEDIATE")
        order = db.execute(
            "SELECT amount_vnd, status, sepay_transaction_id FROM d1_payment_orders WHERE order_code = ?",
            (order_code,),
        ).fetchone()
        if order is None or amount_vnd < order[0]:
            raise ValueError("unknown order or insufficient amount")
        existing = db.execute(
            "SELECT order_code, amount_vnd FROM d1_payment_webhook_events WHERE transaction_id = ?",
            (transaction_id,),
        ).fetchone()
        if existing is not None:
            if existing != (order_code, amount_vnd):
                raise ValueError("transaction ID reused for a different order or amount")
            db.execute("COMMIT")
            return "replay"
        if order[1] == "paid":
            raise ValueError("order already paid by another transaction")
        db.execute(
            "INSERT INTO d1_payment_webhook_events VALUES (?, ?, ?, '2026-10-14T00:00:00Z')",
            (transaction_id, order_code, amount_vnd),
        )
        changed = db.execute(
            "UPDATE d1_payment_orders SET status = 'paid', sepay_transaction_id = ?, "
            "paid_at = '2026-10-14T00:00:00Z' WHERE order_code = ? AND status = 'pending'",
            (transaction_id, order_code),
        ).rowcount
        if changed != 1:
            raise RuntimeError("payment transition lost")
        for action in ACTIONS:
            db.execute(
                "INSERT INTO d1_payment_outbox (order_code, action) VALUES (?, ?)",
                (order_code, action),
            )
        if fail_before_commit:
            raise RuntimeError("simulated failure before commit")
        db.execute("COMMIT")
        return "paid"
    except BaseException:
        if db.in_transaction:
            db.execute("ROLLBACK")
        raise
    finally:
        db.close()


class PaymentIdempotencyPrototypeTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = pathlib.Path(self.temp.name) / "fixture.sqlite"
        with connect(self.path) as db:
            db.executescript(SCHEMA)
            db.executemany(
                "INSERT INTO d1_payment_orders (order_code, amount_vnd, status) VALUES (?, ?, 'pending')",
                [("TAMTEST1", 100000), ("TAMTEST2", 100000)],
            )

    def counts(self):
        with connect(self.path) as db:
            return (
                db.execute("SELECT count(*) FROM d1_payment_webhook_events").fetchone()[0],
                db.execute("SELECT count(*) FROM d1_payment_outbox").fetchone()[0],
            )

    def test_simultaneous_replay_only_one_transition_and_one_outbox_set(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(accept_webhook, self.path, "tx-fixture-1", "TAMTEST1", 100000) for _ in range(2)]
            self.assertEqual(sorted(f.result() for f in futures), ["paid", "replay"])
        self.assertEqual(self.counts(), (1, len(ACTIONS)))

    def test_transaction_id_cannot_pay_another_order(self):
        self.assertEqual(accept_webhook(self.path, "tx-fixture-1", "TAMTEST1", 100000), "paid")
        with self.assertRaisesRegex(ValueError, "transaction ID reused"):
            accept_webhook(self.path, "tx-fixture-1", "TAMTEST2", 100000)
        self.assertEqual(self.counts(), (1, len(ACTIONS)))

    def test_second_transaction_cannot_repay_paid_order(self):
        accept_webhook(self.path, "tx-fixture-1", "TAMTEST1", 100000)
        with self.assertRaisesRegex(ValueError, "already paid"):
            accept_webhook(self.path, "tx-fixture-2", "TAMTEST1", 100000)
        self.assertEqual(self.counts(), (1, len(ACTIONS)))

    def test_failure_and_underpayment_leave_no_partial_payment_or_outbox(self):
        with self.assertRaisesRegex(RuntimeError, "simulated failure"):
            accept_webhook(self.path, "tx-fixture-1", "TAMTEST1", 100000, True)
        with self.assertRaisesRegex(ValueError, "insufficient amount"):
            accept_webhook(self.path, "tx-fixture-1", "TAMTEST1", 99999)
        self.assertEqual(self.counts(), (0, 0))
        self.assertEqual(accept_webhook(self.path, "tx-fixture-1", "TAMTEST1", 100000), "paid")
        self.assertEqual(self.counts(), (1, len(ACTIONS)))


if __name__ == "__main__":
    unittest.main()
