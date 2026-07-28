from __future__ import annotations

import hashlib
import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "architecture-manifest.json"
PROVENANCE_PATH = ROOT / "provenance" / "upstream-files.sha256"


def load_manifest() -> dict:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def parse_hashes() -> dict[str, str]:
    records: dict[str, str] = {}
    for raw_line in PROVENANCE_PATH.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        digest, relative = line.split("  ", 1)
        records[relative] = digest
    return records


def normalized_text_bytes(path: Path) -> bytes:
    text = path.read_text(encoding="utf-8-sig")
    return text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")


class ArchitectureBundleTests(unittest.TestCase):
    def test_manifest_paths_and_relationships_resolve(self) -> None:
        manifest = load_manifest()
        architectures = manifest["architectures"]
        ids = [item["id"] for item in architectures]

        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual("graph-engineering", architectures[0]["id"])
        self.assertEqual("core", architectures[0]["role"])

        for item in architectures:
            self.assertTrue((ROOT / item["path"]).exists(), item["path"])
            self.assertTrue(item["owns"], item["id"])
            self.assertTrue(item["excludes"], item["id"])

        known = set(ids)
        for relation in manifest["relationships"]:
            self.assertIn(relation["from"], known)
            self.assertIn(relation["to"], known)
            self.assertTrue(relation["type"])

        assets = manifest["supporting_assets"]
        asset_ids = [asset["id"] for asset in assets]
        self.assertEqual(len(asset_ids), len(set(asset_ids)))
        self.assertTrue(set(asset_ids).isdisjoint(known))

        for asset in assets:
            self.assertTrue((ROOT / asset["path"]).exists(), asset["path"])
            if asset.get("role") != "presentation-editor":
                continue
            for field in (
                "entrypoint",
                "canonical_contract",
                "presentation_model",
                "interaction_model",
                "provenance",
            ):
                relative = asset[field].split("#", 1)[0]
                self.assertTrue((ROOT / relative).exists(), f"{field}: {relative}")
            for relative in asset["tests"]:
                self.assertTrue((ROOT / relative).is_file(), relative)
            self.assertIn("worker-process execution", asset["excludes"])
            self.assertIn("runtime scheduling or permissions", asset["excludes"])
            self.assertIn("terminal completion certification", asset["excludes"])

    def test_skill_contracts_have_required_sections(self) -> None:
        manifest = load_manifest()
        required_headings = (
            "## Failure Protocol",
            "## Output Contract",
            "## Success Metrics",
            "## Quality Gates",
        )

        for architecture in manifest["architectures"]:
            relative = architecture["path"]
            if not relative.startswith("skills/"):
                continue
            skill_path = ROOT / relative / "SKILL.md"
            text = skill_path.read_text(encoding="utf-8")
            expected_name = Path(relative).name
            match = re.search(r"^name:\s*(.+)$", text, flags=re.MULTILINE)
            self.assertIsNotNone(match, str(skill_path))
            self.assertEqual(expected_name, match.group(1).strip())
            for heading in required_headings:
                self.assertIn(heading, text, f"{heading}: {skill_path}")

    def test_graph_boundary_is_explicit(self) -> None:
        skill = (
            ROOT / "skills" / "graph-engineering" / "SKILL.md"
        ).read_text(encoding="utf-8")
        contract = (
            ROOT
            / "skills"
            / "graph-engineering"
            / "references"
            / "graph-contract.md"
        ).read_text(encoding="utf-8")

        for phrase in (
            "bounded static dependency graph",
            "static DAG contract",
            "typed edges",
            "node-local recovery",
            "whole-graph retry is forbidden",
        ):
            self.assertIn(phrase.lower(), skill.lower())
        normalized_contract = " ".join(contract.split())
        self.assertIn(
            "V7.1 rejects feedback edges and all cycles",
            normalized_contract,
        )

    def test_upstream_hashes_match_copied_files(self) -> None:
        records = parse_hashes()
        self.assertGreaterEqual(len(records), 30)

        for relative, expected in records.items():
            path = ROOT / relative
            self.assertTrue(path.is_file(), relative)
            digest = hashlib.sha256(normalized_text_bytes(path)).hexdigest()
            self.assertEqual(expected, digest, relative)

    def test_generated_python_cache_is_ignored(self) -> None:
        gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")
        self.assertIn("__pycache__/", gitignore)
        self.assertIn("*.pyc", gitignore)

    def test_upstream_commit_is_pinned(self) -> None:
        commit = load_manifest()["upstream"]["commit"]
        self.assertRegex(commit, r"^[0-9a-f]{40}$")
        provenance = (
            ROOT / "docs" / "upstream-provenance.md"
        ).read_text(encoding="utf-8")
        self.assertIn(commit, provenance)


if __name__ == "__main__":
    unittest.main()
