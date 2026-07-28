from __future__ import annotations

import importlib.util
import json
import re
import subprocess
import unittest
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, List, Optional, Tuple


ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "index.html"
BLUEPRINT_PATH = ROOT / "blueprint" / "default-blueprint.json"
MODEL_PATH = ROOT / "blueprint" / "model.js"
APP_PATH = ROOT / "blueprint" / "app.js"
STYLE_PATH = ROOT / "blueprint" / "styles.css"
VALIDATOR_PATH = (
    ROOT
    / "skills"
    / "graph-engineering"
    / "scripts"
    / "validate_graph_contract.py"
)


class BlueprintHtmlParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.references: List[Tuple[str, str]] = []
        self.meta: Dict[str, str] = {}
        self.inline_scripts = 0
        self._in_seed = False
        self._seed_parts: List[str] = []

    @property
    def seed(self) -> str:
        return "".join(self._seed_parts)

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        values = {key: value or "" for key, value in attrs}
        if values.get("id"):
            self.ids.add(values["id"])
        for attribute in ("src", "href"):
            if values.get(attribute):
                self.references.append((attribute, values[attribute]))
        if tag == "meta" and values.get("http-equiv"):
            self.meta[values["http-equiv"].lower()] = values.get("content", "")
        if tag == "script" and not values.get("src"):
            self.inline_scripts += 1
        if tag == "textarea" and values.get("id") == "blueprintSeed":
            self._in_seed = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "textarea" and self._in_seed:
            self._in_seed = False

    def handle_data(self, data: str) -> None:
        if self._in_seed:
            self._seed_parts.append(data)


def load_validator():
    spec = importlib.util.spec_from_file_location("graph_validator", VALIDATOR_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load Graph validator")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class MissionBlueprintTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.index_text = INDEX_PATH.read_text(encoding="utf-8")
        cls.app_text = APP_PATH.read_text(encoding="utf-8")
        cls.model_text = MODEL_PATH.read_text(encoding="utf-8")
        cls.style_text = STYLE_PATH.read_text(encoding="utf-8")
        cls.contract = json.loads(BLUEPRINT_PATH.read_text(encoding="utf-8"))
        cls.parser = BlueprintHtmlParser()
        cls.parser.feed(cls.index_text)

    def test_default_blueprint_passes_strict_graph_validation(self) -> None:
        validator = load_validator()
        self.assertEqual([], validator.validate(self.contract, strict=True))

    def test_embedded_opening_seed_matches_canonical_contract(self) -> None:
        embedded = json.loads(self.parser.seed)
        self.assertEqual(self.contract, embedded)

    def test_root_entrypoint_has_only_local_dependencies(self) -> None:
        for attribute, reference in self.parser.references:
            if attribute == "href" and reference.startswith("#"):
                continue
            self.assertNotRegex(reference, r"^(?:https?:)?//", reference)
            path = ROOT / reference.split("#", 1)[0]
            self.assertTrue(path.is_file(), reference)

        self.assertEqual(0, self.parser.inline_scripts)
        csp = self.parser.meta["content-security-policy"]
        self.assertIn("script-src 'self'", csp)
        self.assertIn("connect-src 'none'", csp)
        self.assertIn("object-src 'none'", csp)

    def test_editor_and_gate_controls_are_present(self) -> None:
        required_ids = {
            "importButton",
            "exportButton",
            "confirmButton",
            "validationBanner",
            "graphStage",
            "nodeInspector",
            "edgeTableBody",
            "joinEditor",
            "teamGate",
            "workstreamGrid",
            "handoffButton",
            "rawJsonEditor",
            "resetButton",
            "confirmDialog",
            "blueprintSeed",
        }
        self.assertTrue(required_ids.issubset(self.parser.ids))

        for binding in (
            'data-bind="objective"',
            'data-bind-list="non_goals"',
            'data-bind-list="blueprint.success_criteria"',
            "data-presentation",
            "data-team-bind",
        ):
            self.assertIn(binding, self.index_text)
        self.assertIn("dataset.showMinimap", self.app_text)
        self.assertIn("dataset.showEvidence", self.app_text)

    def test_editable_content_avoids_html_and_script_sinks(self) -> None:
        combined = "\n".join((self.app_text, self.model_text))
        for forbidden in (
            "innerHTML",
            "outerHTML",
            "insertAdjacentHTML",
            "document.write",
            "eval(",
            "new Function",
            "createElement('script",
            'createElement("script',
        ):
            self.assertNotIn(forbidden, combined)

        self.assertIn("textContent", self.app_text)
        self.assertIn("FORBIDDEN_KEYS", self.model_text)
        self.assertIn("MAX_IMPORT_BYTES", self.model_text)
        self.assertIn("prepareImportedBlueprint", self.model_text)

    def test_confirmation_gate_precedes_every_team_branch(self) -> None:
        nodes = {node["id"]: node for node in self.contract["nodes"]}
        gate_id = self.contract["team_command"]["activation_gate"]
        self.assertEqual("human-gate", nodes[gate_id]["kind"])

        team_node_ids = {
            node["id"]
            for node in self.contract["nodes"]
            if node["kind"] in {"agent", "agent-team"}
            and node["id"].endswith("-stream")
        }
        adjacency = {node_id: set() for node_id in nodes}
        for edge in self.contract["edges"]:
            adjacency[edge["from"]].add(edge["to"])
        reachable_after_gate = set()
        stack = list(adjacency[gate_id])
        while stack:
            node_id = stack.pop()
            if node_id in reachable_after_gate:
                continue
            reachable_after_gate.add(node_id)
            stack.extend(adjacency[node_id] - reachable_after_gate)
        self.assertTrue(team_node_ids.issubset(reachable_after_gate))

        runtime_node = self.contract["team_command"].get("runtime_validation_node", gate_id)
        direct_receipt_targets = {
            edge["to"]
            for edge in self.contract["edges"]
            if edge["from"] in {gate_id, runtime_node}
        }
        self.assertIn("implementation-stream", direct_receipt_targets)
        self.assertIn("contract-review-stream", direct_receipt_targets)
        self.assertIsNone(self.contract["blueprint"]["confirmation"])
        self.assertEqual(
            "LOCKED_UNTIL_CONFIRMATION",
            self.contract["team_command"]["status"],
        )

    def test_team_command_has_exclusive_territories_and_finite_receipts(self) -> None:
        team = self.contract["team_command"]
        streams = team["workstreams"]
        self.assertGreaterEqual(len(streams), 2)
        self.assertEqual(
            {stream["id"] for stream in streams},
            set(team["integration"]["order"]),
        )

        territories: Dict[str, str] = {}
        artifacts = set()
        for stream in streams:
            self.assertNotIn("model", stream)
            self.assertNotIn("provider", stream)
            self.assertTrue(stream["capability"])
            self.assertTrue(stream["verifier"])
            self.assertTrue(stream["stop_condition"])
            for budget in ("max_attempts", "tool_calls", "timeout_seconds"):
                self.assertGreater(stream["budget"][budget], 0)
            self.assertNotIn(stream["output_artifact"], artifacts)
            artifacts.add(stream["output_artifact"])
            for target in stream["territory"]:
                self.assertNotIn(target, territories, target)
                territories[target] = stream["id"]

        for required in (
            "task_id",
            "state",
            "artifact",
            "evidence",
            "decision",
            "unknowns",
            "dependency",
            "next_action",
        ):
            self.assertIn(required, team["ipc_schema"])
        self.assertTrue(team["integration"]["cleanup_receipt"])

    def test_manifest_registers_web_editor_as_supporting_asset(self) -> None:
        manifest = json.loads(
            (ROOT / "architecture-manifest.json").read_text(encoding="utf-8")
        )
        asset = next(
            item
            for item in manifest["supporting_assets"]
            if item["id"] == "mission-blueprint-web"
        )
        self.assertEqual("presentation-editor", asset["role"])
        self.assertEqual("index.html", asset["entrypoint"])
        self.assertEqual("blueprint/default-blueprint.json", asset["canonical_contract"])
        self.assertIn("worker-process execution", asset["excludes"])

    def test_source_contains_no_fixed_vendor_team_bindings(self) -> None:
        presentation_source = "\n".join(
            (self.index_text, self.app_text, self.model_text, self.style_text)
        ).lower()
        self.assertNotIn("claude", presentation_source)
        self.assertNotIn("antigravity", presentation_source)

    def test_node_model_suite_passes(self) -> None:
        result = subprocess.run(
            ["node", "--test", "blueprint/model.test.js"],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
