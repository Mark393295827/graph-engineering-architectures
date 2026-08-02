from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GATE_PATH = ROOT / "tools" / "graph_admission_gate.py"
DEFAULT_GRAPH = ROOT / "blueprint" / "default-blueprint.json"
DIAMOND_GRAPH = ROOT / "skills" / "graph-engineering" / "references" / "diamond-graph-example.json"


def load_gate():
    spec = importlib.util.spec_from_file_location("graph_admission_gate_test_module", GATE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load graph admission gate")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class GraphAdmissionGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.gate = load_gate()
        cls.default_contract = json.loads(DEFAULT_GRAPH.read_text(encoding="utf-8"))
        cls.diamond_contract = json.loads(DIAMOND_GRAPH.read_text(encoding="utf-8"))

    def test_default_graph_is_admitted_with_dependency_evidence(self) -> None:
        receipt = self.gate.analyze_contract(self.default_contract)
        self.assertEqual("ADMIT", receipt["status"])
        self.assertEqual("declared-graph", receipt["dependency_source"])
        self.assertGreaterEqual(receipt["peak_parallel_width"], 2)
        self.assertGreater(receipt["critical_path_payback_seconds"], 0)
        self.assertTrue(receipt["structural_hubs"])
        self.assertEqual("PASS", receipt["planner_gate"]["status"])
        self.assertEqual(0, receipt["planner_gate"]["token_cost"])

    def test_diamond_is_admitted_and_hubs_are_ranked(self) -> None:
        receipt = self.gate.analyze_contract(self.diamond_contract, fanout=4)
        self.assertEqual("ADMIT", receipt["status"])
        self.assertEqual(2, receipt["fanout_budget"]["effective"])
        self.assertGreaterEqual(receipt["structural_hubs"][0]["score"], receipt["structural_hubs"][-1]["score"])

    def test_coupled_or_single_worker_shape_is_serial_only(self) -> None:
        receipt = self.gate.analyze_contract(
            self.diamond_contract,
            fanout=1,
            coupling_profile="coupled",
        )
        self.assertEqual("SERIAL_ONLY", receipt["status"])
        self.assertIn("serial", " ".join(receipt["reasons"]).lower())

    def test_rate_limit_excess_is_rejected_before_parallel_admission(self) -> None:
        receipt = self.gate.analyze_contract(
            self.default_contract,
            fanout=3,
            worker_rate_rps=10,
            rate_limit_rps=10,
        )
        self.assertEqual("RATE_LIMIT_EXCEEDED", receipt["status"])
        self.assertEqual("EXCEEDS_LIMIT", receipt["rate_limit"]["status"])

    def test_unknown_dependency_source_needs_input(self) -> None:
        receipt = self.gate.analyze_contract(self.diamond_contract, dependency_source="unknown")
        self.assertEqual("NEEDS_INPUT", receipt["status"])

    def test_strict_cli_emits_a_receipt(self) -> None:
        output_path = ROOT / ".agent-state" / "test-admission-receipt.json"
        try:
            process = subprocess.run(
                [sys.executable, str(GATE_PATH), str(DEFAULT_GRAPH), "--strict", "--output", str(output_path)],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            self.assertIn("ADMIT graph admission gate", process.stdout)
            receipt = json.loads(output_path.read_text(encoding="utf-8"))
            self.assertEqual("graph-admission/1.0", receipt["schema_version"])
        finally:
            if output_path.exists():
                output_path.unlink()


if __name__ == "__main__":
    unittest.main()
