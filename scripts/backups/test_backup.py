import datetime as dt
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

import backup


class BackupTests(unittest.TestCase):
    def test_portugal_alert_time_follows_both_daylight_saving_transitions(self):
        cases = (
            ("2026-03-29T00:30:00+00:00", "29/03/2026 00:30:00 WET"),
            ("2026-03-29T01:30:00+00:00", "29/03/2026 02:30:00 WEST"),
            ("2026-10-25T00:30:00+00:00", "25/10/2026 01:30:00 WEST"),
            ("2026-10-25T01:30:00+00:00", "25/10/2026 01:30:00 WET"),
        )
        for instant, expected in cases:
            with self.subTest(instant=instant):
                self.assertEqual(backup.portugal_time(dt.datetime.fromisoformat(instant)), expected)

    def test_size_guard_counts_unknown_objects_and_peak_upload(self):
        with self.assertRaises(RuntimeError):
            backup.check_size([{"Size": backup.MAX_STORED_BYTES}], 1)
        with self.assertRaises(RuntimeError):
            backup.check_size([], backup.MAX_ARCHIVE_BYTES + 1)
        backup.check_size([{"Size": backup.MAX_STORED_BYTES - backup.RECEIPT_HEADROOM - 1}], 1)

    def test_budget_persists_attempt_before_failure_and_fails_closed(self):
        with tempfile.TemporaryDirectory() as work:
            path = Path(work) / "ledger.json"
            with self.assertRaises(FileNotFoundError):
                backup.Budget(path)
            month = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m")
            path.write_text(json.dumps({month: {"A": 999, "B": 0}}))
            api = Mock()
            api.list_objects_v2.side_effect = RuntimeError("offline")
            with self.assertRaises(RuntimeError):
                backup.r2_call(api, backup.Budget(path), "A", "list_objects_v2")
            with self.assertRaises(RuntimeError):
                backup.Budget(path).reserve("A")
            self.assertEqual(json.loads(path.read_text())[month]["A"], 1000)
            path.write_text("invalid")
            with self.assertRaises(ValueError):
                backup.Budget(path)

    def test_truncated_inventory_cannot_bypass_storage_guard(self):
        api = Mock()
        api.list_objects_v2.return_value = {"IsTruncated": True}
        with self.assertRaises(RuntimeError):
            backup.inventory(api, Mock(), "bucket")

    def test_changed_source_object_fails_without_creating_database_dumps(self):
        source = Mock()
        source.get_paginator.return_value.paginate.return_value = [
            {"Contents": [{"Key": "cv.pdf", "Size": 1, "ETag": "original"}]}
        ]
        source.get_object.return_value = {"Body": io.BytesIO(b"changed")}
        with tempfile.TemporaryDirectory() as work, patch.object(
            backup, "source_client", return_value=source
        ), patch.object(backup, "run") as command:
            with self.assertRaises(RuntimeError):
                backup.snapshot(Path(work))
            command.assert_not_called()
        source.get_object.assert_called_once_with(
            Bucket=backup.BUCKETS[0], Key="cv.pdf", IfMatch="original"
        )

    def test_retention_requires_readback_and_preserves_unrelated_objects(self):
        with tempfile.TemporaryDirectory() as work:
            archive = Path(work) / "backup.age"
            archive.write_bytes(b"encrypted-test")
            old = [{"Key": f"fallstack/20260101T000000{n:06d}Z.tar.gz.age", "Size": 1}
                   for n in range(30)]
            old += [{"Key": obj["Key"] + ".verified.json", "Size": 1} for obj in old]
            old += [{"Key": "leave-me", "Size": 1},
                    {"Key": "fallstack/20250101T000000000000Z.tar.gz.age", "Size": 1}]
            api = Mock()
            api.get_object.return_value = {"Body": io.BytesIO(b"corrupt")}
            with self.assertRaises(RuntimeError):
                backup.publish(api, Mock(), "bucket", old, archive, "new")
            api.delete_object.assert_not_called()
            api.get_object.return_value = {"Body": io.BytesIO(b"encrypted-test")}
            backup.publish(api, Mock(), "bucket", old, archive, "new")
            self.assertEqual(api.delete_object.call_count, 2)
            self.assertEqual(api.delete_object.call_args_list[0].kwargs,
                             {"Bucket": "bucket", "Key": old[0]["Key"]})
            self.assertEqual(api.delete_object.call_args_list[1].kwargs,
                             {"Bucket": "bucket", "Key": old[0]["Key"] + ".verified.json"})


if __name__ == "__main__":
    unittest.main()
