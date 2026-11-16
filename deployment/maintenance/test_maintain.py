import importlib.util
import pathlib
import unittest
from unittest.mock import patch
import subprocess

spec = importlib.util.spec_from_file_location("maintain", pathlib.Path(__file__).with_name("maintain.py"))
maintain = importlib.util.module_from_spec(spec)
spec.loader.exec_module(maintain)


class RetentionTests(unittest.TestCase):
    def test_disappearing_deployment_container_retries_snapshot_and_fails_closed(self):
        with patch.object(maintain, "docker", side_effect=["old", subprocess.CalledProcessError(1, "inspect"), "new", '[{"Image":"protected"}]']):
            self.assertEqual(maintain.inspect_snapshot(("ps", "-aq"), ("inspect",)), [{"Image": "protected"}])
        with patch.object(maintain, "docker", side_effect=["old", subprocess.CalledProcessError(1, "inspect")] * 3):
            with self.assertRaises(subprocess.CalledProcessError):
                maintain.inspect_snapshot(("ps", "-aq"), ("inspect",))

    def test_keeps_three_latest_all_container_refs_and_unknown_repositories(self):
        images = [{"Id": str(i), "Created": str(i), "RepoTags": [f"app:{i}"]} for i in range(8)]
        images[2]["RepoTags"].append("unrelated:keep")
        self.assertEqual(maintain.image_candidates(images, [{"Image": "0"}, {"Image": "1"}], ["app"], 3), ["app:3", "app:4"])
        self.assertEqual(maintain.image_candidates(images, [], [], 3), [])

    def test_cache_selection_is_bounded_and_excludes_active_or_shared_records(self):
        records = [{"ID": str(i), "CreatedAt": str(i), "Size": "1GB", "Reclaimable": True, "Shared": False} for i in range(4)]
        records[0]["Reclaimable"] = False
        records[1]["Shared"] = True
        self.assertEqual(maintain.cache_candidates(records, 1500000000), (["2"], 1000000000))
        with self.assertRaises(ValueError):
            maintain.byte_size("unknown")


if __name__ == "__main__":
    unittest.main()
