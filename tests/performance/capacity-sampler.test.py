"""Check sampler configuration without contacting Docker or any host."""
import os
import pathlib
import runpy
import unittest
from unittest.mock import patch

SAMPLER = pathlib.Path(__file__).with_name("capacity-sampler.py")
DEV = "CAPACITY_AUTH_DEV_CONTAINER_PREFIX"
PROD = "CAPACITY_AUTH_PROD_CONTAINER_PREFIX"


class SamplerConfigTest(unittest.TestCase):
    def test_missing_prefix_stops_before_opening_output(self):
        for missing in (DEV, PROD):
            with self.subTest(missing=missing):
                env = {DEV: "/zitadel-test-dev-", PROD: "/zitadel-test-prod-"}
                del env[missing]
                with patch.dict(os.environ, env, clear=True), patch("pathlib.Path.open") as output:
                    with self.assertRaises(KeyError):
                        runpy.run_path(str(SAMPLER))
                    output.assert_not_called()

    def test_invalid_prefix_stops_before_opening_output(self):
        for invalid in ("", "/zitadel-", "/unrelated-deployment-"):
            with self.subTest(prefix=invalid):
                with patch.dict(os.environ, {DEV: invalid, PROD: "/zitadel-test-prod-"}, clear=True), patch("pathlib.Path.open") as output:
                    with self.assertRaises(ValueError):
                        runpy.run_path(str(SAMPLER))
                    output.assert_not_called()

    def test_valid_prefixes_reach_output_without_starting_sampler(self):
        with patch.dict(os.environ, {DEV: "/zitadel-test-dev-", PROD: "/zitadel-test-prod-"}, clear=True):
            with patch("pathlib.Path.open", side_effect=InterruptedError("stop before sampling")) as output:
                with self.assertRaises(InterruptedError):
                    runpy.run_path(str(SAMPLER))
                output.assert_called_once_with("a", buffering=1)


if __name__ == "__main__":
    unittest.main()
