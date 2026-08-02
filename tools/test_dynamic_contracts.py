from __future__ import annotations

import copy
import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VALIDATOR_PATH = ROOT / "tools" / "validate_dynamic_contracts.py"


def load_validator():
    spec = importlib.util.spec_from_file_location("dynamic_contract_validator", VALIDATOR_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load dynamic contract validator")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


VALIDATOR = load_validator()


def load_json(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


class DynamicContractTests(unittest.TestCase):
    def test_phase_one_registries_pass_strict_validation(self):
        self.assertEqual([], VALIDATOR.validate())

    def test_all_six_named_adapters_are_declarations_only(self):
        registry = load_json("blueprint/adapter-registry.json")
        self.assertEqual(
            {"claude", "codex", "antigravity", "grok", "kimi", "deepseek"},
            {adapter["adapter_id"] for adapter in registry["adapters"]},
        )
        for adapter in registry["adapters"]:
            self.assertEqual("DECLARED", adapter["runtime_state"]["status"])
            self.assertIsNone(adapter["runtime_state"]["probe_receipt"])
            self.assertNotIn("api_key", adapter)
            self.assertTrue(adapter["connection_ref"].startswith("runtime.adapters."))

    def test_template_catalog_is_finite_and_provider_neutral(self):
        registry = load_json("blueprint/task-template-registry.json")
        self.assertEqual(5, len(registry["templates"]))
        for template in registry["templates"]:
            self.assertFalse(template["dynamic_expansion"])
            self.assertLessEqual(template["max_nodes"], 256)
            for slot in template["input_slots"]:
                self.assertEqual("precompiled", slot["enumeration"])
            self.assertNotIn("adapter_id", template)
            self.assertNotIn("provider", template)

    def test_forbidden_runtime_expansion_and_secret_fields_fail(self):
        registry = load_json("blueprint/task-template-registry.json")
        broken_template = copy.deepcopy(registry["templates"][0])
        broken_template["dynamic_expansion"] = True
        broken_registry = copy.deepcopy(registry)
        broken_registry["templates"][0] = broken_template
        self.assertTrue(VALIDATOR.validate_template_registry(broken_registry))

        adapters = load_json("blueprint/adapter-registry.json")
        broken_adapters = copy.deepcopy(adapters)
        broken_adapters["adapters"][0]["api_key"] = "never-export"
        self.assertTrue(VALIDATOR.validate_adapter_registry(broken_adapters))

    def test_media_manifest_requires_content_reference(self):
        manifest = load_json("blueprint/media-asset-manifest.example.json")
        broken = copy.deepcopy(manifest)
        broken["blob"]["locator_ref"] = "data:application/pdf;base64,AAAA"
        self.assertTrue(VALIDATOR.validate_media_manifest(broken))

        inline = copy.deepcopy(manifest)
        inline["inline_data"] = "AAAA"
        self.assertTrue(VALIDATOR.validate_media_manifest(inline))

    def test_runtime_state_directory_is_ignored(self):
        gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")
        self.assertIn(".agent-state/", gitignore)


if __name__ == "__main__":
    unittest.main()
