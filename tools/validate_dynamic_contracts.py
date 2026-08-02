"""Validate the Phase 1 dynamic multimedia contract registries.

This validator intentionally uses only the Python standard library. The JSON
Schema files document the public shape; this module enforces the repository
invariants that a generic schema validator cannot express, including bounded
templates, probe-gated adapters, content-addressed media references, and the
absence of credentials or durable provider bindings.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable, List, Optional


ROOT = Path(__file__).resolve().parents[1]
CONTRACT_DIR = ROOT / "blueprint" / "contracts"
ADAPTER_REGISTRY = ROOT / "blueprint" / "adapter-registry.json"
TEMPLATE_REGISTRY = ROOT / "blueprint" / "task-template-registry.json"
MEDIA_EXAMPLE = ROOT / "blueprint" / "media-asset-manifest.example.json"

SCHEMAS = {
    "task": CONTRACT_DIR / "task-spec.schema.json",
    "classification": CONTRACT_DIR / "classification-receipt.schema.json",
    "template": CONTRACT_DIR / "blueprint-template.schema.json",
    "bundle": CONTRACT_DIR / "compiled-run-bundle.schema.json",
    "media": CONTRACT_DIR / "media-asset-manifest.schema.json",
    "adapter": CONTRACT_DIR / "adapter-descriptor.schema.json",
    "admission": CONTRACT_DIR / "graph-admission.schema.json",
    "admission_preview": CONTRACT_DIR / "graph-admission-preview.schema.json",
}

EXPECTED_ADAPTERS = {"claude", "codex", "antigravity", "grok", "kimi", "deepseek"}
EXPECTED_TEMPLATES = {
    "software-build-review",
    "research-brief",
    "multimedia-source-fusion",
    "cross-domain-package",
    "approval-before-effect",
}
MEDIA_KINDS = {"text", "image", "audio", "video", "document", "code", "mixed"}
TOPOLOGIES = {"pipeline", "diamond", "bounded-collection", "maker-checker", "human-gate"}
STATUSES = {"DECLARED", "NOT_CONFIGURED", "PROBING", "READY", "DEGRADED", "UNAVAILABLE", "EXPIRED"}
FORBIDDEN_KEY_PARTS = (
    "api_key",
    "apikey",
    "access_token",
    "refresh_token",
    "password",
    "client_secret",
    "credential",
)
FORBIDDEN_BINDING_FIELDS = {
    "model",
    "provider",
    "vendor",
    "selected_adapter_id",
    "preferred_adapter_id",
    "runtime_adapter",
}
IDENTIFIER = re.compile(r"^[a-z][a-z0-9-]{1,63}$")
SHA256 = re.compile(r"^sha256:[a-f0-9]{64}$")


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"cannot load {path.relative_to(ROOT)}: {exc}") from exc


def _walk(value: Any) -> Iterable[tuple[str, Any]]:
    if isinstance(value, dict):
        for key, nested in value.items():
            yield key, nested
            yield from _walk(nested)
    elif isinstance(value, list):
        for nested in value:
            yield from _walk(nested)


def contains_secret(value: Any) -> bool:
    for key, _ in _walk(value):
        normalized = key.lower().replace("-", "_")
        if any(part in normalized for part in FORBIDDEN_KEY_PARTS):
            return True
    return False


def contains_durable_provider_binding(value: Any) -> bool:
    for key, _ in _walk(value):
        if key in FORBIDDEN_BINDING_FIELDS:
            return True
    return False


def _unique_strings(value: Any, *, required: bool = True) -> bool:
    return (
        isinstance(value, list)
        and (bool(value) or not required)
        and all(isinstance(item, str) and bool(item.strip()) for item in value)
        and len(set(value)) == len(value)
    )


def validate_schema_documents() -> list[str]:
    errors: list[str] = []
    for name, path in SCHEMAS.items():
        if not path.is_file():
            errors.append(f"schema missing: {path.relative_to(ROOT)}")
            continue
        try:
            schema = load_json(path)
        except ValueError as exc:
            errors.append(str(exc))
            continue
        if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
            errors.append(f"{name} schema must declare JSON Schema 2020-12")
        if not isinstance(schema.get("$id"), str) or not schema["$id"]:
            errors.append(f"{name} schema must have a stable $id")
        if schema.get("type") != "object":
            errors.append(f"{name} schema root must be an object")
        if not _unique_strings(schema.get("required")):
            errors.append(f"{name} schema must declare required fields")
        if not isinstance(schema.get("properties"), dict):
            errors.append(f"{name} schema must declare properties")
    return errors


def validate_adapter_registry(registry: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(registry, dict):
        return ["adapter registry must be an object"]
    if registry.get("schema_version") != "adapter-registry/1.0":
        errors.append("adapter registry schema_version must be adapter-registry/1.0")
    policy = registry.get("policy")
    if not isinstance(policy, dict):
        errors.append("adapter registry policy must be an object")
    else:
        if policy.get("durable_owners_are_capabilities") is not True:
            errors.append("adapter registry must keep durable owners capability-based")
        if policy.get("require_probe_before_route") is not True:
            errors.append("adapter registry must require a probe before routing")
        if policy.get("unavailable_action") != "PAUSE_AND_ESCALATE":
            errors.append("adapter registry unavailable action must pause and escalate")

    adapters = registry.get("adapters")
    if not isinstance(adapters, list) or not adapters:
        return errors + ["adapter registry adapters must be a non-empty array"]
    ids: list[str] = []
    for index, adapter in enumerate(adapters):
        path = f"adapter[{index}]"
        if not isinstance(adapter, dict):
            errors.append(f"{path} must be an object")
            continue
        adapter_id = adapter.get("adapter_id")
        ids.append(adapter_id)
        if not isinstance(adapter_id, str) or not IDENTIFIER.fullmatch(adapter_id):
            errors.append(f"{path}.adapter_id must be a stable lowercase identifier")
        if not isinstance(adapter.get("display_name"), str) or not adapter["display_name"].strip():
            errors.append(f"{path}.display_name is required")
        if adapter.get("protocol") != "agent-team-ipc/1.0":
            errors.append(f"{path}.protocol must be agent-team-ipc/1.0")
        if adapter.get("connection_ref") != f"runtime.adapters.{adapter_id}":
            errors.append(f"{path}.connection_ref must be an opaque runtime reference")
        if adapter.get("enabled") is not True:
            errors.append(f"{path}.enabled must be true for a declared candidate")
        if not _unique_strings(adapter.get("capability_hints")):
            errors.append(f"{path}.capability_hints must be a unique non-empty list")
        modalities = adapter.get("supported_modalities")
        if not _unique_strings(modalities) or not set(modalities).issubset(MEDIA_KINDS):
            errors.append(f"{path}.supported_modalities must use known media kinds")
        if not _unique_strings(adapter.get("supported_workspace_modes")):
            errors.append(f"{path}.supported_workspace_modes must be a unique non-empty list")
        if not _unique_strings(adapter.get("supported_permission_profiles")):
            errors.append(f"{path}.supported_permission_profiles must be a unique non-empty list")
        if not isinstance(adapter.get("max_concurrency"), int) or adapter["max_concurrency"] < 1:
            errors.append(f"{path}.max_concurrency must be positive")
        runtime_state = adapter.get("runtime_state")
        if not isinstance(runtime_state, dict) or runtime_state.get("status") not in STATUSES:
            errors.append(f"{path}.runtime_state.status is invalid")
        elif runtime_state.get("status") == "DECLARED" and runtime_state.get("probe_receipt") is not None:
            errors.append(f"{path} cannot claim a probe receipt while DECLARED")
        if contains_secret(adapter):
            errors.append(f"{path} contains a secret-shaped field")
        if contains_durable_provider_binding(adapter):
            errors.append(f"{path} contains a durable provider binding")
    if len(ids) != len(set(ids)):
        errors.append("adapter registry contains duplicate adapter ids")
    if set(ids) != EXPECTED_ADAPTERS:
        errors.append(
            "adapter registry must declare exactly Claude Code, Codex, Antigravity, Grok, Kimi, and DeepSeek"
        )
    return errors


def validate_template_registry(registry: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(registry, dict):
        return ["template registry must be an object"]
    if registry.get("schema_version") != "task-template-registry/1.0":
        errors.append("template registry schema_version must be task-template-registry/1.0")
    policy = registry.get("compiler_policy")
    if not isinstance(policy, dict):
        errors.append("template registry compiler_policy must be an object")
    else:
        if policy.get("dynamic_expansion") is not False:
            errors.append("template compiler policy must reject dynamic expansion")
        if policy.get("unknown_input_action") != "NEEDS_INPUT":
            errors.append("unknown template inputs must stop with NEEDS_INPUT")
        if policy.get("runtime_change_action") != "SUPERSEDE_AND_RECOMPILE":
            errors.append("runtime semantic changes must supersede and recompile")
    templates = registry.get("templates")
    if not isinstance(templates, list) or not templates:
        return errors + ["template registry templates must be a non-empty array"]
    ids: list[str] = []
    for index, template in enumerate(templates):
        path = f"template[{index}]"
        if not isinstance(template, dict):
            errors.append(f"{path} must be an object")
            continue
        template_id = template.get("template_id")
        ids.append(template_id)
        if not isinstance(template_id, str) or not IDENTIFIER.fullmatch(template_id):
            errors.append(f"{path}.template_id must be a stable lowercase identifier")
        if template.get("schema_version") != "blueprint-template/1.0":
            errors.append(f"{path}.schema_version is invalid")
        if template.get("topology") not in TOPOLOGIES:
            errors.append(f"{path}.topology is invalid")
        max_nodes = template.get("max_nodes")
        if not isinstance(max_nodes, int) or not 1 <= max_nodes <= 256:
            errors.append(f"{path}.max_nodes must be finite and bounded")
        if template.get("dynamic_expansion") is not False:
            errors.append(f"{path} must compile a static graph")
        if not _unique_strings(template.get("capability_requirements")):
            errors.append(f"{path}.capability_requirements must be non-empty")
        if not _unique_strings(template.get("verifier_pack")):
            errors.append(f"{path}.verifier_pack must be non-empty")
        if contains_secret(template) or contains_durable_provider_binding(template):
            errors.append(f"{path} contains forbidden secret or provider binding")
        for slot_index, slot in enumerate(template.get("input_slots", [])):
            slot_path = f"{path}.input_slots[{slot_index}]"
            if slot.get("enumeration") != "precompiled":
                errors.append(f"{slot_path} must be enumerated before compilation")
            if not isinstance(slot.get("min"), int) or not isinstance(slot.get("max"), int):
                errors.append(f"{slot_path} cardinality must be integer")
            elif not 0 <= slot["min"] <= slot["max"] <= 256:
                errors.append(f"{slot_path} cardinality must be finite and ordered")
            if not set(slot.get("media_kinds", [])).issubset(MEDIA_KINDS):
                errors.append(f"{slot_path}.media_kinds contains an unknown kind")
    if len(ids) != len(set(ids)):
        errors.append("template registry contains duplicate template ids")
    if set(ids) != EXPECTED_TEMPLATES:
        errors.append("template registry does not contain the complete Phase 1 catalog")
    return errors


def validate_media_manifest(manifest: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(manifest, dict):
        return ["media manifest must be an object"]
    if manifest.get("schema_version") != "media-asset/1.0":
        errors.append("media manifest schema_version must be media-asset/1.0")
    blob = manifest.get("blob")
    if not isinstance(blob, dict):
        errors.append("media manifest blob must be an object")
    else:
        if not SHA256.fullmatch(blob.get("id", "")):
            errors.append("media blob id must be a SHA-256 content identity")
        if not isinstance(blob.get("byte_length"), int) or blob["byte_length"] < 1:
            errors.append("media blob byte_length must be positive")
        if not re.fullmatch(r"^cas://sha256/[a-f0-9]{64}$", blob.get("locator_ref", "")):
            errors.append("media blob locator must be a content-addressed reference")
    if not SHA256.fullmatch(manifest.get("asset_version_id", "")):
        errors.append("asset_version_id must be a SHA-256 manifest identity")
    if manifest.get("media_kind") not in MEDIA_KINDS:
        errors.append("media_kind is unknown")
    safety = manifest.get("safety")
    if not isinstance(safety, dict) or safety.get("status") not in {"QUARANTINED", "ACCEPTED", "BLOCKED"}:
        errors.append("media safety status is invalid")
    if contains_secret(manifest) or "inline_data" in manifest:
        errors.append("media manifest must not contain credentials or inline media bytes")
    return errors


def validate() -> list[str]:
    errors = validate_schema_documents()
    try:
        errors.extend(validate_adapter_registry(load_json(ADAPTER_REGISTRY)))
    except ValueError as exc:
        errors.append(str(exc))
    try:
        errors.extend(validate_template_registry(load_json(TEMPLATE_REGISTRY)))
    except ValueError as exc:
        errors.append(str(exc))
    try:
        errors.extend(validate_media_manifest(load_json(MEDIA_EXAMPLE)))
    except ValueError as exc:
        errors.append(str(exc))
    return errors


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--strict", action="store_true", help="return non-zero on any contract error")
    args = parser.parse_args(argv)
    errors = validate()
    if errors:
        for error in errors:
            print(f"ERROR {error}", file=sys.stderr)
        return 1
    print("PASS dynamic multimedia contract registries")
    print(f"  adapters: {len(EXPECTED_ADAPTERS)} declared, probe required before routing")
    print(f"  templates: {len(EXPECTED_TEMPLATES)} bounded, dynamic expansion disabled")
    print("  media: content-addressed references only")
    return 0 if args.strict else 0


if __name__ == "__main__":
    raise SystemExit(main())
