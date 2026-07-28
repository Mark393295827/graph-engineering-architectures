from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BLUEPRINT_PATH = ROOT / "blueprint" / "default-blueprint.json"
VALIDATOR_PATH = ROOT / "tools" / "validate_mission_handoff.py"


def load_module():
    spec = importlib.util.spec_from_file_location("handoff_validator", VALIDATOR_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load handoff validator")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


HANDOFF_VALIDATOR = load_module()


def load_blueprint():
    return json.loads(BLUEPRINT_PATH.read_text(encoding="utf-8"))


def structure_projection(contract):
    projection = {
        key: value
        for key, value in contract.items()
        if key not in {"blueprint", "team_command"}
    }
    projection["mission"] = {
        "title": contract["blueprint"]["mission_title"],
        "summary": contract["blueprint"]["summary"],
        "success_criteria": contract["blueprint"]["success_criteria"],
    }
    return projection


def make_handoff(contract):
    graph_contract = structure_projection(contract)
    contract_hash = HANDOFF_VALIDATOR.sha256_json(graph_contract)
    command = json.loads(json.dumps(contract["team_command"]))
    command.pop("status", None)
    command["handoff"] = None
    command_hash = HANDOFF_VALIDATOR.sha256_json(command)
    return {
        "schema_version": "1.1",
        "handoff_id": f"{contract['graph_id']}-r1",
        "status": "PENDING_RUNTIME_VALIDATION",
        "contract_sha256": contract_hash,
        "command_sha256": command_hash,
        "confirmation_receipt": {
            "schema_version": "1.0",
            "graph_id": contract["graph_id"],
            "contract_sha256": contract_hash,
            "client_validation": {
                "status": "PASSED",
                "validator": "BlueprintModel.validateBlueprint",
                "contract_sha256": contract_hash,
            },
            "confirmed_by": "test-owner",
            "confirmed_at": "2026-07-28T00:00:00Z",
            "status": "HUMAN_CONFIRMED",
        },
        "graph_contract": graph_contract,
        "command": command,
        "runtime_validation": {
            "status": "REQUIRED",
            "contract_locator": "handoff.graph_contract",
            "command_locator": "handoff.command",
            "expected_contract_sha256": contract_hash,
            "expected_command_sha256": command_hash,
            "receipt": None,
        },
        "adapter_readiness": {
            "status": "REQUIRED",
            "node_id": command["adapter_readiness_node"],
            "required_adapter_ids": command["agent_roster"][
                "required_adapter_ids"
            ],
            "browser_claims_endpoint_health": False,
            "launch_authorized": False,
            "required_receipts": [
                "adapter_probe_receipts",
                "capability_route_receipt",
                "workspace_isolation_receipts",
                "permission_receipts",
                "ipc_ledger_readiness_receipt",
            ],
            "receipt": None,
        },
    }


class MissionHandoffValidatorTests(unittest.TestCase):
    def test_python_canonical_hash_matches_the_browser_model(self):
        blueprint = load_blueprint()
        result = subprocess.run(
            [
                "node",
                "-e",
                (
                    "const M=require('./blueprint/model.js');"
                    "const b=require('./blueprint/default-blueprint.json');"
                    "process.stdout.write(M.structureHash(b));"
                ),
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )

        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(
            result.stdout,
            HANDOFF_VALIDATOR.sha256_json(structure_projection(blueprint)),
        )

    def test_exact_embedded_contract_passes_and_emits_command_evidence(self):
        handoff = make_handoff(load_blueprint())

        receipt = HANDOFF_VALIDATOR.validate_handoff_document(handoff)

        self.assertEqual("RUNTIME_CONTRACT_VALIDATED", receipt["status"])
        self.assertEqual(0, receipt["validator_exit_code"])
        self.assertEqual(handoff["contract_sha256"], receipt["contract_sha256"])
        self.assertEqual(handoff["command_sha256"], receipt["command_sha256"])
        self.assertTrue(receipt["command_contract_validated"])
        self.assertFalse(receipt["launch_authorized"])
        self.assertEqual("REQUIRED", receipt["adapter_readiness_status"])
        self.assertIn("PASS graph contract", receipt["validator_stdout"])

    def test_browser_edited_contract_validates_its_own_hash_not_the_seed(self):
        seed = load_blueprint()
        seed_hash = HANDOFF_VALIDATOR.sha256_json(structure_projection(seed))
        seed["objective"] += " Browser-edited objective."
        handoff = make_handoff(seed)

        receipt = HANDOFF_VALIDATOR.validate_handoff_document(handoff)

        self.assertEqual("RUNTIME_CONTRACT_VALIDATED", receipt["status"])
        self.assertNotEqual(seed_hash, receipt["contract_sha256"])

    def test_missing_or_tampered_command_fails_before_graph_execution(self):
        missing = make_handoff(load_blueprint())
        missing.pop("command")
        missing_receipt = HANDOFF_VALIDATOR.validate_handoff_document(missing)
        self.assertEqual("RUNTIME_VALIDATION_FAILED", missing_receipt["status"])
        self.assertIsNone(missing_receipt["validator_exit_code"])

        tampered = make_handoff(load_blueprint())
        tampered["command"]["routing"]["selection_policy"] = "fixed-vendor"
        tampered_receipt = HANDOFF_VALIDATOR.validate_handoff_document(tampered)
        self.assertEqual("RUNTIME_VALIDATION_FAILED", tampered_receipt["status"])
        self.assertTrue(
            any("command hash" in error for error in tampered_receipt["errors"])
        )

    def test_adapter_contract_rejects_browser_authority_and_secret_fields(self):
        handoff = make_handoff(load_blueprint())
        adapter = handoff["command"]["agent_roster"]["adapters"][0]
        adapter["api_key"] = "must-never-be-exported"
        adapter["runtime_state"] = {
            "status": "READY",
            "probe_receipt": {"status": "SELF_CERTIFIED"},
        }
        command_hash = HANDOFF_VALIDATOR.sha256_json(handoff["command"])
        handoff["command_sha256"] = command_hash
        handoff["runtime_validation"]["expected_command_sha256"] = command_hash

        receipt = HANDOFF_VALIDATOR.validate_handoff_document(handoff)

        self.assertEqual("RUNTIME_VALIDATION_FAILED", receipt["status"])
        joined = "\n".join(receipt["errors"]).lower()
        self.assertIn("secret", joined)
        self.assertIn("unverified", joined)

    def test_runtime_adapter_id_cannot_be_a_durable_graph_owner(self):
        handoff = make_handoff(load_blueprint())
        handoff["graph_contract"]["owner"] = "Codex"
        contract_hash = HANDOFF_VALIDATOR.sha256_json(handoff["graph_contract"])
        handoff["contract_sha256"] = contract_hash
        handoff["confirmation_receipt"]["contract_sha256"] = contract_hash
        handoff["confirmation_receipt"]["client_validation"][
            "contract_sha256"
        ] = contract_hash
        handoff["runtime_validation"]["expected_contract_sha256"] = contract_hash

        receipt = HANDOFF_VALIDATOR.validate_handoff_document(handoff)

        self.assertEqual("RUNTIME_VALIDATION_FAILED", receipt["status"])
        self.assertTrue(
            any(
                "graph.owner must be a capability role" in error
                for error in receipt["errors"]
            )
        )
        self.assertIsNone(receipt["validator_exit_code"])

    def test_tampered_contract_fails_before_claiming_validator_evidence(self):
        handoff = make_handoff(load_blueprint())
        handoff["graph_contract"]["objective"] += " Tampered."

        receipt = HANDOFF_VALIDATOR.validate_handoff_document(handoff)

        self.assertEqual("RUNTIME_VALIDATION_FAILED", receipt["status"])
        self.assertEqual("HANDOFF_CONTRACT_INVALID", receipt["failure_status"])
        self.assertIsNone(receipt["validator_exit_code"])
        self.assertTrue(
            any("hash does not match" in error for error in receipt["errors"])
        )

    def test_hash_bound_invalid_graph_emits_strict_validation_failure(self):
        handoff = make_handoff(load_blueprint())
        handoff["graph_contract"]["edges"].append(
            {
                "from": "terminal-verification",
                "to": "mission-intake",
                "type": "control",
                "payload_schema": "",
                "condition": "always",
                "failure_route": "",
            }
        )
        contract_hash = HANDOFF_VALIDATOR.sha256_json(handoff["graph_contract"])
        handoff["contract_sha256"] = contract_hash
        handoff["confirmation_receipt"]["contract_sha256"] = contract_hash
        handoff["confirmation_receipt"]["client_validation"][
            "contract_sha256"
        ] = contract_hash
        handoff["runtime_validation"]["expected_contract_sha256"] = contract_hash

        receipt = HANDOFF_VALIDATOR.validate_handoff_document(handoff)

        self.assertEqual("RUNTIME_VALIDATION_FAILED", receipt["status"])
        self.assertEqual(
            "STRICT_GRAPH_VALIDATION_FAILED",
            receipt["failure_status"],
        )
        self.assertNotEqual(0, receipt["validator_exit_code"])
        validator_output = (
            receipt["validator_stdout"] + "\n" + receipt["validator_stderr"]
        ).lower()
        self.assertIn("acyclic", validator_output)

    def test_cli_writes_the_same_durable_receipt_it_prints(self):
        handoff = make_handoff(load_blueprint())
        with tempfile.TemporaryDirectory() as temp_dir:
            handoff_path = Path(temp_dir) / "handoff.json"
            receipt_path = Path(temp_dir) / "receipt.json"
            handoff_path.write_text(
                json.dumps(handoff, ensure_ascii=False),
                encoding="utf-8",
            )

            result = subprocess.run(
                [
                    sys.executable,
                    str(VALIDATOR_PATH),
                    str(handoff_path),
                    "--receipt",
                    str(receipt_path),
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )

            self.assertEqual(0, result.returncode, result.stderr)
            self.assertEqual(
                json.loads(result.stdout),
                json.loads(receipt_path.read_text(encoding="utf-8")),
            )


if __name__ == "__main__":
    unittest.main()
