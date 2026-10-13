import json
from pathlib import Path
import tempfile
import unittest

from importlib.machinery import SourceFileLoader

module = SourceFileLoader("mirror", str(Path(__file__).with_name("verify-jsonl-mirror.py"))).load_module()


class VerifyMirrorTest(unittest.TestCase):
    def test_matches_canonical_json_and_detects_changed_rows(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            left, right = root / "source", root / "target"
            left.mkdir()
            right.mkdir()
            manifest = root / "manifest.json"
            manifest.write_text(json.dumps([{"schema": "public", "table": "lessons", "primary_key": ["id"]}]))
            (left / "public.lessons.jsonl").write_text('{"id":"a","title":"Bài học"}\n')
            (right / "public.lessons.jsonl").write_text('{"title":"Bài học","id":"a"}\n')
            self.assertEqual(module.verify(left, right, manifest), 0)
            (right / "public.lessons.jsonl").write_text('{"id":"a","title":"Đổi"}\n')
            self.assertEqual(module.verify(left, right, manifest), 1)

    def test_rejects_duplicate_primary_key(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "public.lessons.jsonl"
            path.write_text('{"id":"a"}\n{"id":"a"}\n')
            with self.assertRaisesRegex(ValueError, "duplicate key"):
                module.digest_table(path, ["id"])


if __name__ == "__main__":
    unittest.main()
