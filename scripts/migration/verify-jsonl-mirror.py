#!/usr/bin/env python3
"""Compare logical PostgreSQL/D1 JSONL exports without printing row contents.

Each input is a directory of <schema>.<table>.jsonl files. Both exporters must
produce the same logical columns/types and order rows by the listed primary key.
This is a verification gate, not an exporter or a database backup.
"""

import argparse
import hashlib
import json
from pathlib import Path
import sys


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
                      allow_nan=False).encode("utf-8")


def digest_table(path: Path, key_columns: list[str]):
    if not path.is_file() or path.is_symlink():
        raise ValueError(f"missing or unsafe input file: {path.name}")
    count = 0
    digest = hashlib.sha256()
    previous_key = None
    with path.open("r", encoding="utf-8") as source:
        for line_number, line in enumerate(source, 1):
            if not line.strip():
                raise ValueError(f"blank row in {path.name} at line {line_number}")
            row = json.loads(line, parse_constant=lambda _: (_ for _ in ()).throw(ValueError("non-finite number")))
            if not isinstance(row, dict) or any(column not in row or row[column] is None for column in key_columns):
                raise ValueError(f"invalid primary key in {path.name} at line {line_number}")
            key = canonical([row[column] for column in key_columns])
            if previous_key is not None and key <= previous_key:
                raise ValueError(f"rows not strictly sorted or duplicate key in {path.name} at line {line_number}")
            previous_key = key
            payload = canonical(row)
            digest.update(len(payload).to_bytes(8, "big"))
            digest.update(payload)
            count += 1
    return count, digest.hexdigest()


def verify(source: Path, target: Path, manifest: Path):
    spec = json.loads(manifest.read_text(encoding="utf-8"))
    if not isinstance(spec, list) or not spec:
        raise ValueError("manifest must contain a nonempty list")
    seen = set()
    mismatches = 0
    for item in spec:
        schema, table, columns = item["schema"], item["table"], item["primary_key"]
        if not all(isinstance(name, str) and name.isidentifier() for name in [schema, table, *columns]) or not columns:
            raise ValueError("unsafe manifest identifier")
        name = f"{schema}.{table}.jsonl"
        if name in seen:
            raise ValueError("duplicate table in manifest")
        seen.add(name)
        left = digest_table(source / name, columns)
        right = digest_table(target / name, columns)
        match = left == right
        mismatches += not match
        # No customer rows, keys, hashes, or file paths appear in output.
        print(f"{'PASS' if match else 'FAIL'} {schema}.{table} source_rows={left[0]} target_rows={right[0]}")
    return mismatches


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--target", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    args = parser.parse_args()
    try:
        return 1 if verify(args.source, args.target, args.manifest) else 0
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
        print(f"Verification blocked: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
