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

    def test_runtime_governance_examples_pass_as_one_bound_pair(self):
        policy = load_json("blueprint/runtime-governance-policy.example.json")
        receipt = load_json("blueprint/runtime-governance-receipt.example.json")

        self.assertEqual([], VALIDATOR.validate_runtime_governance(policy, receipt))

    def test_runtime_governance_rejects_soft_or_unmetered_enforcement(self):
        policy = load_json("blueprint/runtime-governance-policy.example.json")
        receipt = load_json("blueprint/runtime-governance-receipt.example.json")

        for field, invalid in (
            ("mode", "SOFT_WARN"),
            ("reserve_before_dispatch", False),
            ("unmetered_action", "CONTINUE"),
            ("on_exhaustion", "SUCCEEDED"),
        ):
            broken = copy.deepcopy(policy)
            broken["enforcement"][field] = invalid
            self.assertTrue(
                VALIDATOR.validate_runtime_governance(broken, receipt),
                field,
            )

        provider_bound = copy.deepcopy(policy)
        provider_bound["provider"] = "example-provider"
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(provider_bound, receipt)
        )

    def test_runtime_governance_rejects_over_cap_or_inconsistent_usage(self):
        policy = load_json("blueprint/runtime-governance-policy.example.json")
        receipt = load_json("blueprint/runtime-governance-receipt.example.json")
        dimensions = {
            "input_tokens": "max_input_tokens",
            "output_tokens": "max_output_tokens",
            "total_tokens": "max_total_tokens",
            "compute_units": "max_compute_units",
            "spend_micros": "max_spend_micros",
        }

        for actual, maximum in dimensions.items():
            broken = copy.deepcopy(receipt)
            broken["usage"][actual] = policy["hard_limits"][maximum] + 1
            self.assertTrue(
                VALIDATOR.validate_runtime_governance(policy, broken),
                actual,
            )

        bad_total = copy.deepcopy(receipt)
        bad_total["usage"]["total_tokens"] += 1
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(policy, bad_total)
        )

        bad_currency = copy.deepcopy(receipt)
        bad_currency["usage"]["currency"] = "EUR"
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(policy, bad_currency)
        )

        no_meter = copy.deepcopy(receipt)
        no_meter["usage"]["metering_receipt_refs"] = []
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(policy, no_meter)
        )

        no_reservation = copy.deepcopy(receipt)
        no_reservation["usage"]["dispatch_reservation_receipt_refs"] = []
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(policy, no_reservation)
        )

    def test_runtime_governance_binds_policy_hash_and_budget_stop(self):
        policy = load_json("blueprint/runtime-governance-policy.example.json")
        receipt = load_json("blueprint/runtime-governance-receipt.example.json")

        wrong_hash = copy.deepcopy(receipt)
        wrong_hash["policy_sha256"] = "0" * 64
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(policy, wrong_hash)
        )

        missing_stop = copy.deepcopy(receipt)
        missing_stop["status"] = "BUDGET_STOP"
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(policy, missing_stop)
        )

        false_stop = copy.deepcopy(receipt)
        false_stop["usage"]["budget_stop_dimension"] = "total_tokens"
        false_stop["usage"]["budget_stop_receipt_ref"] = "artifact:stop-001"
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(policy, false_stop)
        )

    def test_runtime_governance_requires_measured_prompt_cache_evidence(self):
        policy = load_json("blueprint/runtime-governance-policy.example.json")
        receipt = load_json("blueprint/runtime-governance-receipt.example.json")

        broken_partition = copy.deepcopy(receipt)
        broken_partition["prompt_cache"]["cache_read_input_tokens"] -= 1
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(policy, broken_partition)
        )

        too_many_hits = copy.deepcopy(receipt)
        too_many_hits["prompt_cache"]["hit_requests"] = 5
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(policy, too_many_hits)
        )

        no_evidence = copy.deepcopy(receipt)
        no_evidence["prompt_cache"]["evidence_refs"] = []
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(policy, no_evidence)
        )

        persisted_prompt = copy.deepcopy(receipt)
        persisted_prompt["prompt_cache"]["prompt_content_persisted"] = True
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(policy, persisted_prompt)
        )

    def test_runtime_governance_cost_per_outcome_is_exact_and_receipt_backed(self):
        policy = load_json("blueprint/runtime-governance-policy.example.json")
        receipt = load_json("blueprint/runtime-governance-receipt.example.json")

        count_mismatch = copy.deepcopy(receipt)
        count_mismatch["accepted_outcomes"]["count"] = 3
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(policy, count_mismatch)
        )

        bad_ratio = copy.deepcopy(receipt)
        bad_ratio["accepted_outcomes"]["cost_per_accepted_outcome"][
            "quotient_micros"
        ] += 1
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(policy, bad_ratio)
        )

        no_outcomes = copy.deepcopy(receipt)
        no_outcomes["accepted_outcomes"]["count"] = 0
        no_outcomes["accepted_outcomes"]["acceptance_receipt_refs"] = []
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(policy, no_outcomes)
        )

    def test_runtime_governance_eval_promotion_is_privacy_gated_and_quarantined(self):
        policy = load_json("blueprint/runtime-governance-policy.example.json")
        receipt = load_json("blueprint/runtime-governance-receipt.example.json")
        gate_fields = (
            "privacy_profile_ref",
            "opt_in_receipt_ref",
            "privacy_scan_receipt_ref",
            "redaction_receipt_ref",
            "human_approval_receipt_ref",
        )

        for field in gate_fields:
            broken = copy.deepcopy(receipt)
            broken["interaction_to_eval"][field] = None
            self.assertTrue(
                VALIDATOR.validate_runtime_governance(policy, broken),
                field,
            )

        wrong_destination = copy.deepcopy(receipt)
        wrong_destination["interaction_to_eval"]["destination"] = "production"
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(policy, wrong_destination)
        )

        excessive_retention = copy.deepcopy(receipt)
        excessive_retention["interaction_to_eval"]["retention_days"] = 31
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(policy, excessive_retention)
        )

        raw_interaction = copy.deepcopy(receipt)
        raw_interaction["interaction_to_eval"]["interaction_text"] = "private"
        self.assertTrue(
            VALIDATOR.validate_runtime_governance(policy, raw_interaction)
        )

        for field in (
            "automatic_production_mutation",
            "automatic_schema_mutation",
            "automatic_skill_mutation",
        ):
            broken = copy.deepcopy(receipt)
            broken["interaction_to_eval"][field] = True
            self.assertTrue(
                VALIDATOR.validate_runtime_governance(policy, broken),
                field,
            )


if __name__ == "__main__":
    unittest.main()
