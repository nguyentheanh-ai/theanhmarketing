"""Synthetic checks for the D1 source slice; never reads customer records."""

from pathlib import Path
import sqlite3


SCHEMA = Path(__file__).with_name("d1-course-access-source-prototype.sql").read_text()


def main():
    db = sqlite3.connect(":memory:")
    db.executescript(SCHEMA)
    db.execute("INSERT INTO d1_access_users VALUES (?,?,?)", ("user-1", "qa@example.invalid", None))
    db.execute("INSERT INTO d1_access_orders VALUES (?,?,?,?,?,?,?,?)", (
        "order-1", "qa@example.invalid", "paid", "fallback-course", "Fixture",
        "agent-kit-preorder-deposit", '[{"slug":"fixture-course","title":"Fixture"}]', None,
    ))
    db.execute("INSERT INTO d1_access_overrides VALUES (?,?,?,?,?)", (
        "lead-1", "qa@example.invalid", "admin-access-grant:fixture-course",
        "2026-10-14T00:00:00Z", None,
    ))
    db.execute("INSERT INTO d1_access_overrides VALUES (?,?,?,?,?)", (
        "lead-2", "qa@example.invalid", "admin-access-revoke:fixture-course",
        "2026-10-14T01:00:00Z", None,
    ))
    rows = db.execute(
        "SELECT source FROM d1_access_overrides WHERE normalized_email=? AND deleted_at IS NULL "
        "ORDER BY created_at,id", ("qa@example.invalid",)
    ).fetchall()
    assert rows == [
        ("admin-access-grant:fixture-course",),
        ("admin-access-revoke:fixture-course",),
    ]
    assert db.execute("SELECT json_extract(order_items_json,'$[0].slug') FROM d1_access_orders").fetchone()[0] == "fixture-course"
    for sql, params in [
        ("INSERT INTO d1_access_users VALUES (?,?,?)", ("user-2", "QA@example.invalid", None)),
        ("INSERT INTO d1_access_users VALUES (?,?,?)", ("user-3", "qa@example.invalid", None)),
        ("INSERT INTO d1_access_orders VALUES (?,?,?,?,?,?,?,?)", (
            "bad-order", "qa@example.invalid", "paid", None, None, None, "{}", None,
        )),
        ("INSERT INTO d1_access_sync_state VALUES (?,?,?,?)", (
            "source-a", "2026-10-14T00:00:00Z", None, "ready_for_cutover",
        )),
    ]:
        try:
            db.execute(sql, params)
        except sqlite3.IntegrityError:
            continue
        raise AssertionError("Invalid source/sync row was accepted")
    print("PASS: paid order inputs, ordered grant/revoke history, JSON/email/sync guards (synthetic)")


if __name__ == "__main__":
    main()
