"""Synthetic, local test of the D1 LMS prototype. Never uses customer records."""

from pathlib import Path
import sqlite3

SCHEMA = Path(__file__).with_name("d1-lms-compatibility-prototype.sql").read_text()
NOW = "2026-10-13T08:00:00.000Z"


def denied(db, sql, params=()):
    try:
        db.execute(sql, params)
    except sqlite3.IntegrityError:
        return
    raise AssertionError(f"Constraint did not reject: {sql}")


def scoped_enrollments(db, user_id, verified_email, slug):
    # Must only be called after the backend verifies the signed Auth session.
    # Email fallback reflects the current PostgreSQL RPC; ownership must be
    # re-evaluated before a production D1 switch.
    return db.execute(
        """SELECT e.id FROM d1_lms_enrollments e
           LEFT JOIN d1_lms_contacts c ON c.id=e.contact_id
           LEFT JOIN d1_lms_courses course ON course.id=e.course_id
           WHERE (e.user_id=? OR (length(trim(?))>0 AND
                    lower(trim(coalesce(nullif(c.source_email,''),
                    json_extract(e.metadata,'$.student_email'))))=lower(trim(?))))
             AND coalesce(nullif(e.course_slug,''),
                 nullif(json_extract(e.metadata,'$.course_slug'),''),course.slug)=?
             AND e.status IN ('active','completed')
             AND (e.expires_at IS NULL OR e.expires_at>?)""",
        (user_id, verified_email, verified_email, slug, NOW),
    ).fetchall()


def main():
    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA foreign_keys=ON")
    db.executescript(SCHEMA)
    a = "00000000-0000-4000-8000-000000000001"
    b = "00000000-0000-4000-8000-000000000002"
    course = "00000000-0000-4000-8000-000000000003"
    module = "00000000-0000-4000-8000-000000000004"
    lesson = "00000000-0000-4000-8000-000000000005"
    contact = "00000000-0000-4000-8000-000000000006"
    enrollment = "00000000-0000-4000-8000-000000000007"
    progress = "00000000-0000-4000-8000-000000000008"
    db.execute("INSERT INTO d1_lms_courses VALUES (?,?,?,?)", (course,"qa-course","published","enrolled"))
    db.execute("INSERT INTO d1_lms_modules VALUES (?,?,?)", (module,course,"published"))
    db.execute("INSERT INTO d1_lms_lessons VALUES (?,?,?,?,?,?)", (lesson,course,module,"qa-lesson","published",1))
    db.execute("INSERT INTO d1_lms_contacts VALUES (?,?,?)", (contact,"qa@example.invalid","qa@example.invalid"))
    db.execute("INSERT INTO d1_lms_enrollments VALUES (?,?,?,?,?,?,?, ?,?)",
               (enrollment,contact,a,course,"qa-course","active",None,NOW,"{}"))
    assert scoped_enrollments(db,a,"qa@example.invalid","qa-course")==[(enrollment,)]
    assert scoped_enrollments(db,b,"other@example.invalid","qa-course")==[]
    assert scoped_enrollments(db,a,"qa@example.invalid","other-course")==[]
    db.execute("UPDATE d1_lms_enrollments SET expires_at=? WHERE id=?",("2026-10-12T00:00:00.000Z",enrollment))
    assert scoped_enrollments(db,a,"qa@example.invalid","qa-course")==[]
    db.execute("UPDATE d1_lms_enrollments SET expires_at=NULL WHERE id=?",(enrollment,))
    db.execute("INSERT INTO d1_lms_progress VALUES (?,?,?,?,?,?,?,?)",
               (progress,enrollment,lesson,"completed",100,NOW,NOW,"{}"))
    denied(db,"INSERT INTO d1_lms_progress VALUES (?,?,?,?,?,?,?,?)",
           (b,enrollment,lesson,"completed",100,NOW,NOW,"{}"))
    denied(db,"INSERT INTO d1_lms_progress VALUES (?,?,?,?,?,?,?,?)",
           (b,b,lesson,"completed",100,NOW,NOW,"{}"))
    denied(db,"INSERT INTO d1_lms_enrollments VALUES (?,?,?,?,?,?,?,?,?)",
           (b,None,a,course,"qa-course","active",None,NOW,"{}"))
    denied(db,"INSERT INTO d1_lms_lessons VALUES (?,?,?,?,?,?)",
           (b,b,module,"bad","published",1))
    other_course = "00000000-0000-4000-8000-000000000010"
    other_module = "00000000-0000-4000-8000-000000000011"
    other_lesson = "00000000-0000-4000-8000-000000000012"
    db.execute("INSERT INTO d1_lms_courses VALUES (?,?,?,?)",
               (other_course,"other-course","published","enrolled"))
    db.execute("INSERT INTO d1_lms_modules VALUES (?,?,?)",
               (other_module,other_course,"published"))
    db.execute("INSERT INTO d1_lms_lessons VALUES (?,?,?,?,?,?)",
               (other_lesson,other_course,other_module,"other-lesson","published",1))
    denied(db,"INSERT INTO d1_lms_progress VALUES (?,?,?,?,?,?,?,?)",
           (b,enrollment,other_lesson,"completed",100,NOW,NOW,"{}"))
    denied(db,"UPDATE d1_lms_progress SET lesson_id=? WHERE id=?",(other_lesson,progress))
    denied(db,"INSERT INTO d1_lms_enrollments VALUES (?,?,?,?,?,?,?,?,?)",
           (b,None,b,course,"bad","invalid",None,NOW,"{}"))
    assert db.execute("SELECT COUNT(*) FROM d1_lms_progress").fetchone()[0]==1
    print("PASS: scoped entitlement, course/expiry guard, progress uniqueness, cross-course guard, FK, status checks (synthetic)")


if __name__ == "__main__":
    main()
