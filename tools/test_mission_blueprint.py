from __future__ import annotations

import importlib.util
import hashlib
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
REFERENCE_STYLE_PATH = ROOT / "blueprint" / "reference-diagram.css"
REFERENCE_ASSET_PATH = ROOT / "blueprint" / "reference-assets"
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
        cls.reference_style_text = REFERENCE_STYLE_PATH.read_text(encoding="utf-8")
        cls.contract = json.loads(BLUEPRINT_PATH.read_text(encoding="utf-8"))
        cls.parser = BlueprintHtmlParser()
        cls.parser.feed(cls.index_text)

    def test_default_blueprint_passes_strict_graph_validation(self) -> None:
        validator = load_validator()
        self.assertEqual([], validator.validate(self.contract, strict=True))

    def test_beginner_block_transactions_pass_strict_graph_validation(self) -> None:
        script = """
const fs = require('node:fs');
const Model = require('./blueprint/model.js');
const seed = JSON.parse(fs.readFileSync('./blueprint/default-blueprint.json', 'utf8'));
const candidates = Model.getBlockCatalog().map((block) => {
  const result = Model.applyBlockTransaction(seed, {
    schema_version: '1.0',
    operations: [{ op: 'insert-block', block_type: block.id }]
  });
  if (!result.ok) throw new Error(`${block.id}: ${result.errors[0].message}`);
  return { id: `block:${block.id}`, contract: result.candidate };
});
Model.getBlockRecipes().forEach((recipe) => {
  const result = Model.applyBlockRecipe(seed, recipe.id);
  if (!result.ok) throw new Error(`${recipe.id}: ${result.errors[0].message}`);
  candidates.push({ id: `recipe:${recipe.id}`, contract: result.candidate });
});
process.stdout.write(JSON.stringify(candidates));
"""
        process = subprocess.run(
            ["node", "-e", script],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        candidates = json.loads(process.stdout)
        validator = load_validator()
        for candidate in candidates:
            with self.subTest(block_or_recipe=candidate["id"]):
                self.assertEqual(
                    [],
                    validator.validate(candidate["contract"], strict=True),
                )

    def test_exported_structure_projection_is_strict_valid_and_hashable(self) -> None:
        projection = {
            key: value
            for key, value in self.contract.items()
            if key not in {"blueprint", "team_command"}
        }
        projection["mission"] = {
            "title": self.contract["blueprint"]["mission_title"],
            "summary": self.contract["blueprint"]["summary"],
            "success_criteria": self.contract["blueprint"]["success_criteria"],
        }
        validator = load_validator()
        self.assertEqual([], validator.validate(projection, strict=True))

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
            "blockBuilder",
            "blockModeToggle",
            "advancedModeToggle",
            "starterRecipeGrid",
            "blockPalette",
            "blockWorkspace",
            "blockCompileButton",
            "blockCompileStatus",
            "blockIssueList",
            "undoButton",
            "redoButton",
            "graphStage",
            "nodeInspector",
            "edgeTableBody",
            "joinEditor",
            "teamGate",
            "workstreamGrid",
            "handoffButton",
            "runtimeRosterGrid",
            "architectureDiagram",
            "architectureAnimationToggle",
            "architectureReferenceToggle",
            "architectureFullscreenToggle",
            "rawJsonEditor",
            "resetButton",
            "confirmDialog",
            "blueprintSeed",
            "taskIntake",
            "taskIntakeTitle",
            "compileTaskPreviewButton",
            "dynamicCompileStatus",
            "adapterCandidateStrip",
            "graphAdmission",
            "graphAdmissionTitle",
            "admissionStatus",
            "admissionSummary",
            "admissionPreviewButton",
            "admissionCriticalPath",
            "admissionEffectiveFanout",
            "admissionProjectedRate",
            "admissionHubCount",
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
        self.assertIn("ensureDynamicBlueprint", self.app_text)
        self.assertIn("compileTaskPreview", self.app_text)
        self.assertIn("calculateGraphAdmission", self.app_text)
        self.assertIn("compileAdmissionPreview", self.app_text)
        self.assertIn("graph-admission", self.app_text)
        self.assertIn("PREVIEW_READY", self.app_text)
        self.assertIn('data-bind="task_spec.template_id"', self.index_text)
        self.assertIn('data-bind-list="task_spec.input_asset_refs"', self.index_text)
        for admission_binding in (
            'data-bind="task_spec.admission.dependency_source"',
            'data-bind="task_spec.admission.partition_strategy"',
            'data-bind="task_spec.admission.coupling_profile"',
            'data-bind-list="task_spec.admission.structural_hubs"',
            'data-bind="task_spec.admission.critical_path_floor_seconds"',
            'data-bind="task_spec.admission.fanout_ceiling"',
            'data-bind="task_spec.admission.rate_limit_rps"',
            'data-bind="task_spec.admission.worker_rate_rps"',
            'data-bind="task_spec.admission.coordination_tax_ceiling_percent"',
            'data-bind="task_spec.admission.planner_gate"',
        ):
            self.assertIn(admission_binding, self.index_text)
        for adapter_name in ("Claude Code", "Codex", "Antigravity", "Grok", "Kimi", "DeepSeek"):
            self.assertIn(adapter_name, self.index_text)
        self.assertEqual(
            "blocks",
            self.contract["blueprint"]["presentation"]["editor_mode"],
        )

    def test_beginner_blocks_have_atomic_and_keyboard_safe_controls(self) -> None:
        for block_type in (
            "clarify",
            "approval",
            "bounded-loop",
            "final-check",
        ):
            self.assertIn(f'data-block-template="{block_type}"', self.index_text)
        for recipe in (
            "clear-and-check",
            "approval-path",
            "bounded-improvement",
        ):
            self.assertIn(f'data-block-recipe="{recipe}"', self.index_text)
        self.assertIn('id="blockWorkspace"', self.index_text)
        self.assertIn("row.setAttribute('role', 'list')", self.app_text)
        self.assertIn('id="blockCompileStatus" role="status"', self.index_text)
        self.assertIn('id="blockModeToggle"', self.index_text)
        self.assertIn('aria-pressed="true"', self.index_text)
        self.assertIn("Model.applyBlockTransaction", self.app_text)
        self.assertIn("Model.applyBlockRecipe", self.app_text)
        self.assertIn("Model.restoreEditableSnapshot", self.app_text)
        self.assertIn("Model.recoverEditableDraft", self.app_text)
        self.assertIn("op: 'update-block'", self.app_text)
        self.assertIn("dataset.blockAction", self.app_text)
        self.assertIn("BLOCK_TRANSACTION_CLIENT_VALIDATED", self.model_text)
        self.assertIn("event.receipt = deepClone(receipt)", self.model_text)
        self.assertNotIn('draggable="true"', self.index_text)
        self.assertRegex(
            self.index_text,
            r'id="addWorkstreamButton"[\s\S]{0,400}?disabled',
        )

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

    def test_mission_preview_nodes_are_native_keyboard_buttons(self) -> None:
        self.assertIn(
            "createElement('button', `graph-node kind-${node.kind}`)",
            self.app_text,
        )
        self.assertIn("Open graph editor for node", self.app_text)
        self.assertIn("event.key !== 'Enter'", self.app_text)
        self.assertIn("openPreviewNode(card)", self.app_text)
        self.assertNotIn("interactive ? 'button' : 'div'", self.app_text)

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
        self.assertEqual("deterministic", nodes[runtime_node]["kind"])
        gate_targets = {
            edge["to"]
            for edge in self.contract["edges"]
            if edge["from"] == gate_id
        }
        runtime_targets = {
            edge["to"]
            for edge in self.contract["edges"]
            if edge["from"] == runtime_node
        }
        self.assertIn(runtime_node, gate_targets)
        readiness_node = self.contract["team_command"]["adapter_readiness_node"]
        self.assertEqual("deterministic", nodes[readiness_node]["kind"])
        self.assertEqual("harness-runtime", nodes[readiness_node]["owner"])
        self.assertEqual({readiness_node}, runtime_targets)
        readiness_targets = {
            edge["to"]
            for edge in self.contract["edges"]
            if edge["from"] == readiness_node
        }
        self.assertIn("implementation-stream", readiness_targets)
        self.assertIn("contract-review-stream", readiness_targets)
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
        nodes = {node["id"]: node for node in self.contract["nodes"]}
        mapped_nodes = set()
        for stream in streams:
            for forbidden in (
                "model",
                "provider",
                "vendor",
                "adapter_id",
                "runtime_adapter",
            ):
                self.assertNotIn(forbidden, stream)
            mapped_node = nodes[stream["graph_node_id"]]
            self.assertIn(mapped_node["kind"], {"agent", "agent-team"})
            self.assertEqual(mapped_node["owner"], stream["owner"])
            self.assertNotIn(mapped_node["id"], mapped_nodes)
            mapped_nodes.add(mapped_node["id"])
            self.assertTrue(stream["capability"])
            self.assertTrue(stream["verifier"])
            self.assertTrue(stream["stop_condition"])
            for budget in ("max_attempts", "tool_calls", "timeout_seconds"):
                self.assertGreater(stream["budget"][budget], 0)
                self.assertLessEqual(stream["budget"][budget], mapped_node[budget])
            self.assertIn(stream["output_artifact"], mapped_node["writes"])
            self.assertIn(stream["output_artifact"], stream["territory"])
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
        ipc = team["ipc_contract"]
        self.assertEqual("agent-team-ipc/1.0", ipc["protocol"])
        self.assertEqual("append-only-jsonl", ipc["transport"])
        for required in (
            "message_id",
            "sender_adapter_id",
            "recipient_adapter_id",
            "contract_sha256",
            "command_sha256",
            "message_sha256",
        ):
            self.assertIn(required, ipc["required_envelope_fields"])
        self.assertTrue(team["integration"]["cleanup_receipt"])
        integration_node = nodes[team["integration"]["graph_node_id"]]
        self.assertEqual(team["integration_owner"], integration_node["owner"])

    def test_graph_wall_time_covers_the_declared_critical_path(self) -> None:
        nodes = {node["id"]: node for node in self.contract["nodes"]}
        adjacency = {node_id: set() for node_id in nodes}
        indegree = {node_id: 0 for node_id in nodes}
        for edge in self.contract["edges"]:
            if edge["type"] not in {"data", "control", "verification"}:
                continue
            if edge["to"] not in adjacency[edge["from"]]:
                adjacency[edge["from"]].add(edge["to"])
                indegree[edge["to"]] += 1

        duration = {
            node_id: node["timeout_seconds"]
            for node_id, node in nodes.items()
        }
        ready = [node_id for node_id, count in indegree.items() if count == 0]
        while ready:
            node_id = ready.pop()
            for target in adjacency[node_id]:
                duration[target] = max(
                    duration[target],
                    duration[node_id] + nodes[target]["timeout_seconds"],
                )
                indegree[target] -= 1
                if indegree[target] == 0:
                    ready.append(target)
        self.assertLessEqual(
            max(duration.values()),
            self.contract["budgets"]["wall_time_seconds"],
        )

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
        self.assertEqual(
            "tools/validate_mission_handoff.py",
            asset["runtime_validator"],
        )
        self.assertEqual(
            "blueprint/reference-diagram.css",
            asset["reference_layout"],
        )
        self.assertEqual(
            "blueprint/default-blueprint.json#team_command.agent_roster",
            asset["runtime_adapter_contract"],
        )
        self.assertEqual(
            manifest["bundle_version"],
            self.contract["blueprint"]["blueprint_version"],
        )
        self.assertIn("worker-process execution", asset["excludes"])

    def test_reference_layout_and_named_runtime_roster_are_preserved(self) -> None:
        source = "\n".join(
            (
                self.index_text,
                self.app_text,
                self.model_text,
                self.style_text,
                self.reference_style_text,
            )
        ).lower()
        for name in ("claude", "antigravity", "codex"):
            self.assertIn(name, source)

        for token in (
            "width: 1536px",
            "height: 1024px",
            "left: 59px; top: 148px; width: 249px; height: 178px",
            "left: 414px; top: 176px; width: 381px; height: 193px",
            "left: 913px; top: 122px; width: 341px; height: 409px",
            "left: 29px; top: 667px; width: 1478px; height: 340px",
            "--violet: #a64cff",
            "--orange: #ff7a00",
            "--cyan: #00d8e8",
            "--blue: #087eff",
            "--lime: #69e600",
        ):
            self.assertIn(token, self.reference_style_text.lower())
        self.assertIn(
            "visual lifecycle, not a graph cycle",
            self.index_text.lower(),
        )
        self.assertEqual(
            38,
            len(list(REFERENCE_ASSET_PATH.rglob("*.*"))),
        )

    def test_reference_asset_checksum_ledger_matches_copied_files(self) -> None:
        ledger_path = ROOT / "provenance" / "blueprint-reference-assets.sha256"
        records = {}
        for raw_line in ledger_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            digest, relative = line.split("  ", 1)
            records[relative] = digest
        assets = list(REFERENCE_ASSET_PATH.rglob("*.*"))
        self.assertEqual(len(assets), len(records))
        for asset in assets:
            relative = asset.relative_to(ROOT).as_posix()
            self.assertIn(relative, records)
            self.assertEqual(
                records[relative],
                hashlib.sha256(asset.read_bytes()).hexdigest(),
            )

    def test_runtime_adapters_are_declared_not_durable_owners(self) -> None:
        team = self.contract["team_command"]
        adapters = team["agent_roster"]["adapters"]
        self.assertEqual(
            {"claude", "antigravity", "codex"},
            {adapter["id"] for adapter in adapters},
        )
        for adapter in adapters:
            self.assertTrue(adapter["enabled"])
            self.assertEqual("harness-managed", adapter["launch_mode"])
            self.assertEqual("UNVERIFIED", adapter["runtime_state"]["status"])
            self.assertIsNone(adapter["runtime_state"]["probe_receipt"])
        vendor_ids = {adapter["id"] for adapter in adapters}
        self.assertTrue(
            all(node["owner"] not in vendor_ids for node in self.contract["nodes"])
        )
        self.assertTrue(
            all(stream["owner"] not in vendor_ids for stream in team["workstreams"])
        )
        self.assertEqual(
            {stream["id"] for stream in team["workstreams"]},
            {
                request["workstream_id"]
                for request in team["routing"]["route_requests"]
            },
        )
        for request in team["routing"]["route_requests"]:
            self.assertNotIn("adapter_id", request)
            self.assertNotIn("preferred_adapter_id", request)

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
