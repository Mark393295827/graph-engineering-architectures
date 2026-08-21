"""Validate the Phase 1 dynamic multimedia contract registries.

This validator intentionally uses only the Python standard library. The JSON
Schema files document the public shape; this module enforces the repository
invariants that a generic schema validator cannot express, including bounded
templates, probe-gated adapters, content-addressed media references, and the
absence of credentials or durable provider bindings.
"""

from __future__ import annotations

import argparse
import hashlib
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
RUNTIME_GOVERNANCE_POLICY_EXAMPLE = (
    ROOT / "blueprint" / "runtime-governance-policy.example.json"
)
RUNTIME_GOVERNANCE_RECEIPT_EXAMPLE = (
    ROOT / "blueprint" / "runtime-governance-receipt.example.json"
)

SCHEMAS = {
    "task": CONTRACT_DIR / "task-spec.schema.json",
    "classification": CONTRACT_DIR / "classification-receipt.schema.json",
    "template": CONTRACT_DIR / "blueprint-template.schema.json",
    "bundle": CONTRACT_DIR / "compiled-run-bundle.schema.json",
    "media": CONTRACT_DIR / "media-asset-manifest.schema.json",
    "adapter": CONTRACT_DIR / "adapter-descriptor.schema.json",
    "admission": CONTRACT_DIR / "graph-admission.schema.json",
    "admission_preview": CONTRACT_DIR / "graph-admission-preview.schema.json",
    "runtime_governance": CONTRACT_DIR / "runtime-governance.schema.json",
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
BARE_SHA256 = re.compile(r"^[a-f0-9]{64}$")
ARTIFACT_REF = re.compile(r"^artifact:[A-Za-z0-9._:-]+$")
ISO_UTC = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$")
RAW_INTERACTION_KEYS = {
    "raw_interaction",
    "interaction_text",
    "prompt_text",
    "message_content",
}


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


def _integer(value: Any, *, minimum: int = 0) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= minimum


def _artifact_ref(value: Any) -> bool:
    return isinstance(value, str) and bool(ARTIFACT_REF.fullmatch(value))


def _artifact_refs(value: Any, *, required: bool = False) -> bool:
    return (
        isinstance(value, list)
        and (bool(value) or not required)
        and all(_artifact_ref(item) for item in value)
        and len(value) == len(set(value))
    )


def _exact_fields(value: Any, fields: set[str]) -> bool:
    return isinstance(value, dict) and set(value) == fields


def stable_stringify(value: Any) -> str:
    """Match BlueprintModel stable JSON hashing for run-lock evidence."""
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )


def sha256_json(value: Any) -> str:
    return hashlib.sha256(stable_stringify(value).encode("utf-8")).hexdigest()


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


def validate_runtime_governance(policy: Any, receipt: Any) -> list[str]:
    """Validate a hash-bound runtime policy and its append-only evidence receipt.

    This is deliberately a contract check, not a claim that a Harness exists or
    that any provider reported the example values. Runtime enforcement remains
    host-owned; the examples prove only the repository's public record shape and
    cross-record invariants.
    """

    errors: list[str] = []
    policy_fields = {
        "schema_version",
        "record_type",
        "policy_id",
        "run_scope_ref",
        "hard_limits",
        "enforcement",
        "cache_context_policy",
        "interaction_to_eval_policy",
        "topology_boundary",
        "issued_at",
    }
    receipt_fields = {
        "schema_version",
        "record_type",
        "receipt_id",
        "run_id",
        "policy_ref",
        "policy_sha256",
        "run_lock",
        "status",
        "usage",
        "prompt_cache",
        "accepted_outcomes",
        "interaction_to_eval",
        "issued_at",
    }

    if not _exact_fields(policy, policy_fields):
        errors.append("runtime governance policy fields must match the public POLICY shape")
        return errors
    if policy.get("schema_version") != "runtime-governance/1.0":
        errors.append("runtime governance policy schema_version is invalid")
    if policy.get("record_type") != "POLICY":
        errors.append("runtime governance policy record_type must be POLICY")
    policy_id = policy.get("policy_id")
    if not isinstance(policy_id, str) or not IDENTIFIER.fullmatch(policy_id):
        errors.append("runtime governance policy_id must be a stable identifier")
    if not _artifact_ref(policy.get("run_scope_ref")):
        errors.append("runtime governance run_scope_ref must be an artifact reference")
    if not isinstance(policy.get("issued_at"), str) or not ISO_UTC.fullmatch(
        policy["issued_at"]
    ):
        errors.append("runtime governance policy issued_at must be a UTC timestamp")
    if contains_secret(policy) or contains_durable_provider_binding(policy):
        errors.append("runtime governance policy contains a secret or provider binding")

    hard_limit_fields = {
        "max_input_tokens",
        "max_output_tokens",
        "max_total_tokens",
        "max_compute_units",
        "compute_meter_ref",
        "max_spend_micros",
        "currency",
    }
    limits = policy.get("hard_limits")
    if not _exact_fields(limits, hard_limit_fields):
        errors.append("runtime governance hard_limits fields are incomplete")
        limits = {}
    numeric_caps = (
        "max_input_tokens",
        "max_output_tokens",
        "max_total_tokens",
        "max_compute_units",
        "max_spend_micros",
    )
    for field in numeric_caps:
        if not _integer(limits.get(field), minimum=1):
            errors.append(f"runtime governance {field} must be a positive integer")
    if all(_integer(limits.get(field), minimum=1) for field in (
        "max_input_tokens",
        "max_output_tokens",
        "max_total_tokens",
    )) and limits["max_total_tokens"] > (
        limits["max_input_tokens"] + limits["max_output_tokens"]
    ):
        errors.append("max_total_tokens cannot exceed input plus output token caps")
    if not _artifact_ref(limits.get("compute_meter_ref")):
        errors.append("compute_meter_ref must be an artifact reference")
    if not isinstance(limits.get("currency"), str) or not re.fullmatch(
        r"^[A-Z]{3}$", limits["currency"]
    ):
        errors.append("runtime governance currency must be a three-letter code")

    enforcement = policy.get("enforcement")
    expected_enforcement = {
        "owner": "harness-engineering",
        "mode": "HARD_PRE_DISPATCH",
        "reserve_before_dispatch": True,
        "unmetered_action": "BLOCK",
        "on_exhaustion": "BUDGET_STOP",
    }
    if enforcement != expected_enforcement:
        errors.append("runtime governance must fail closed under Harness enforcement")

    cache_policy = policy.get("cache_context_policy")
    expected_cache_policy = {
        "owner": "context-manager",
        "context_manifest_required": True,
        "stable_prefix_hash_required": True,
        "prompt_content_in_receipts": False,
    }
    if cache_policy != expected_cache_policy:
        errors.append("cache context policy must be hash-bound and Context-owned")

    promotion_policy = policy.get("interaction_to_eval_policy")
    promotion_policy_fields = {
        "default_action",
        "source_mode",
        "require_explicit_opt_in",
        "require_privacy_scan",
        "require_redaction",
        "require_human_approval",
        "allowed_destination",
        "max_retention_days",
        "automatic_production_mutation",
        "automatic_schema_mutation",
        "automatic_skill_mutation",
    }
    if not _exact_fields(promotion_policy, promotion_policy_fields):
        errors.append("interaction-to-eval policy fields are incomplete")
        promotion_policy = {}
    expected_promotion_constants = {
        "default_action": "DENY",
        "source_mode": "HASHED_REFERENCE_ONLY",
        "require_explicit_opt_in": True,
        "require_privacy_scan": True,
        "require_redaction": True,
        "require_human_approval": True,
        "allowed_destination": "eval-quarantine",
        "automatic_production_mutation": False,
        "automatic_schema_mutation": False,
        "automatic_skill_mutation": False,
    }
    for field, expected in expected_promotion_constants.items():
        if promotion_policy.get(field) != expected:
            errors.append(f"interaction-to-eval policy {field} must be {expected!r}")
    if not _integer(promotion_policy.get("max_retention_days"), minimum=1) or (
        isinstance(promotion_policy.get("max_retention_days"), int)
        and promotion_policy["max_retention_days"] > 365
    ):
        errors.append("interaction-to-eval retention must be between 1 and 365 days")

    expected_topology_boundary = {
        "graph_dynamic_expansion": False,
        "graph_feedback_edges": False,
        "runtime_routing_scope": "PREDECLARED_CAPABILITY_ROUTES",
        "semantic_change_action": "SUPERSEDE_AND_RECOMPILE",
    }
    if policy.get("topology_boundary") != expected_topology_boundary:
        errors.append("runtime governance cannot mutate or cycle the active Graph")

    if not _exact_fields(receipt, receipt_fields):
        errors.append("runtime governance receipt fields must match the public RECEIPT shape")
        return errors
    if receipt.get("schema_version") != "runtime-governance/1.0":
        errors.append("runtime governance receipt schema_version is invalid")
    if receipt.get("record_type") != "RECEIPT":
        errors.append("runtime governance receipt record_type must be RECEIPT")
    if not isinstance(receipt.get("receipt_id"), str) or not re.fullmatch(
        r"^[a-z][a-z0-9._-]{1,95}$", receipt["receipt_id"]
    ):
        errors.append("runtime governance receipt_id is invalid")
    if not isinstance(receipt.get("run_id"), str) or not re.fullmatch(
        r"^[a-z0-9][a-z0-9-]{0,95}$", receipt["run_id"]
    ):
        errors.append("runtime governance run_id is invalid")
    if receipt.get("policy_ref") != f"artifact:{policy_id}":
        errors.append("runtime governance receipt policy_ref does not resolve to the policy")
    if receipt.get("policy_sha256") != sha256_json(policy):
        errors.append("runtime governance receipt policy_sha256 does not match the policy")
    if not isinstance(receipt.get("issued_at"), str) or not ISO_UTC.fullmatch(
        receipt["issued_at"]
    ):
        errors.append("runtime governance receipt issued_at must be a UTC timestamp")
    if receipt.get("status") not in {"SUCCEEDED", "PARTIAL", "FAILED", "BUDGET_STOP"}:
        errors.append("runtime governance receipt status is invalid")
    if contains_secret(receipt) or contains_durable_provider_binding(receipt):
        errors.append("runtime governance receipt contains a secret or provider binding")

    run_lock = receipt.get("run_lock")
    run_lock_fields = {"compiled_run_sha256", "graph_sha256", "command_sha256"}
    if not _exact_fields(run_lock, run_lock_fields) or not all(
        isinstance(run_lock.get(field), str) and BARE_SHA256.fullmatch(run_lock[field])
        for field in run_lock_fields
    ):
        errors.append("runtime governance receipt must bind compiled run, Graph, and command hashes")

    usage_fields = {
        "input_tokens",
        "output_tokens",
        "total_tokens",
        "compute_units",
        "spend_micros",
        "currency",
        "metering_receipt_refs",
        "dispatch_reservation_receipt_refs",
        "budget_stop_dimension",
        "budget_stop_receipt_ref",
    }
    usage = receipt.get("usage")
    if not _exact_fields(usage, usage_fields):
        errors.append("runtime governance usage fields are incomplete")
        usage = {}
    actual_to_cap = {
        "input_tokens": "max_input_tokens",
        "output_tokens": "max_output_tokens",
        "total_tokens": "max_total_tokens",
        "compute_units": "max_compute_units",
        "spend_micros": "max_spend_micros",
    }
    for actual, cap in actual_to_cap.items():
        value = usage.get(actual)
        if not _integer(value):
            errors.append(f"runtime governance usage {actual} must be nonnegative")
        elif _integer(limits.get(cap), minimum=1) and value > limits[cap]:
            errors.append(f"runtime governance usage {actual} exceeds {cap}")
    if all(_integer(usage.get(field)) for field in (
        "input_tokens", "output_tokens", "total_tokens"
    )) and usage["total_tokens"] != usage["input_tokens"] + usage["output_tokens"]:
        errors.append("runtime governance total_tokens must equal input plus output")
    if usage.get("currency") != limits.get("currency"):
        errors.append("runtime governance receipt currency does not match the policy")
    if not _artifact_refs(usage.get("metering_receipt_refs")):
        errors.append("metering_receipt_refs must be unique artifact references")
    if not _artifact_refs(usage.get("dispatch_reservation_receipt_refs")):
        errors.append("dispatch_reservation_receipt_refs must be unique artifact references")
    if any(_integer(usage.get(field)) and usage[field] > 0 for field in actual_to_cap):
        if not _artifact_refs(usage.get("metering_receipt_refs"), required=True):
            errors.append("nonzero usage requires metering evidence")
        if not _artifact_refs(
            usage.get("dispatch_reservation_receipt_refs"), required=True
        ):
            errors.append("nonzero usage requires a pre-dispatch reservation receipt")
    stop_dimensions = set(actual_to_cap)
    stop_dimension = usage.get("budget_stop_dimension")
    stop_receipt = usage.get("budget_stop_receipt_ref")
    stopped = receipt.get("status") == "BUDGET_STOP"
    if stopped:
        if stop_dimension not in stop_dimensions or not _artifact_ref(stop_receipt):
            errors.append("BUDGET_STOP requires a dimension and stop receipt")
    elif stop_dimension is not None or stop_receipt is not None:
        errors.append("only BUDGET_STOP may carry budget-stop evidence")

    cache_fields = {
        "status",
        "context_manifest_ref",
        "stable_prefix_sha256",
        "uncached_input_tokens",
        "cache_write_input_tokens",
        "cache_read_input_tokens",
        "eligible_requests",
        "hit_requests",
        "evidence_refs",
        "prompt_content_persisted",
    }
    cache = receipt.get("prompt_cache")
    if not _exact_fields(cache, cache_fields):
        errors.append("runtime governance prompt_cache fields are incomplete")
        cache = {}
    for field in (
        "uncached_input_tokens",
        "cache_write_input_tokens",
        "cache_read_input_tokens",
        "eligible_requests",
        "hit_requests",
    ):
        if not _integer(cache.get(field)):
            errors.append(f"prompt cache {field} must be nonnegative")
    if all(_integer(cache.get(field)) for field in (
        "uncached_input_tokens",
        "cache_write_input_tokens",
        "cache_read_input_tokens",
    )) and _integer(usage.get("input_tokens")):
        cache_input = sum(cache[field] for field in (
            "uncached_input_tokens",
            "cache_write_input_tokens",
            "cache_read_input_tokens",
        ))
        if cache_input != usage["input_tokens"]:
            errors.append("prompt cache token partition must equal usage input_tokens")
    if _integer(cache.get("hit_requests")) and _integer(cache.get("eligible_requests")):
        if cache["hit_requests"] > cache["eligible_requests"]:
            errors.append("prompt cache hit_requests cannot exceed eligible_requests")
    if cache.get("prompt_content_persisted") is not False:
        errors.append("prompt content cannot be persisted in a governance receipt")
    if not _artifact_refs(cache.get("evidence_refs")):
        errors.append("prompt cache evidence_refs must be unique artifact references")
    cache_status = cache.get("status")
    if cache_status == "EVIDENCED":
        if not _artifact_ref(cache.get("context_manifest_ref")):
            errors.append("evidenced cache use requires a context manifest")
        if not isinstance(cache.get("stable_prefix_sha256"), str) or not SHA256.fullmatch(
            cache["stable_prefix_sha256"]
        ):
            errors.append("evidenced cache use requires a stable-prefix hash")
        if not _integer(cache.get("cache_read_input_tokens"), minimum=1):
            errors.append("evidenced cache use requires measured cache-read tokens")
        if not _integer(cache.get("hit_requests"), minimum=1):
            errors.append("evidenced cache use requires at least one measured hit")
        if not _artifact_refs(cache.get("evidence_refs"), required=True):
            errors.append("evidenced cache use requires a meter receipt")
    elif cache_status in {"NOT_USED", "UNSUPPORTED"}:
        if any(cache.get(field) not in {0, None} for field in (
            "cache_write_input_tokens",
            "cache_read_input_tokens",
            "hit_requests",
        )) or cache.get("evidence_refs"):
            errors.append("unused or unsupported cache cannot claim measured benefits")
    else:
        errors.append("prompt cache status is invalid")

    outcome_fields = {
        "verifier_owner",
        "count",
        "acceptance_receipt_refs",
        "cost_per_accepted_outcome",
    }
    outcomes = receipt.get("accepted_outcomes")
    if not _exact_fields(outcomes, outcome_fields):
        errors.append("accepted_outcomes fields are incomplete")
        outcomes = {}
    if outcomes.get("verifier_owner") != "verify-before-claim":
        errors.append("accepted outcomes must be owned by verify-before-claim")
    count = outcomes.get("count")
    refs = outcomes.get("acceptance_receipt_refs")
    if not _integer(count):
        errors.append("accepted outcome count must be nonnegative")
    if not _artifact_refs(refs):
        errors.append("acceptance receipt references must be unique artifacts")
    if _integer(count) and isinstance(refs, list) and len(refs) != count:
        errors.append("accepted outcome count must equal its receipt count")
    ratio = outcomes.get("cost_per_accepted_outcome")
    if count == 0:
        if ratio is not None:
            errors.append("zero accepted outcomes cannot claim cost per outcome")
    elif _integer(count, minimum=1):
        ratio_fields = {
            "currency",
            "total_spend_micros",
            "accepted_outcome_count",
            "quotient_micros",
            "remainder_micros",
        }
        if not _exact_fields(ratio, ratio_fields):
            errors.append("positive accepted outcomes require an exact cost ratio")
        else:
            if ratio.get("currency") != usage.get("currency"):
                errors.append("cost-per-outcome currency must match usage")
            if ratio.get("total_spend_micros") != usage.get("spend_micros"):
                errors.append("cost-per-outcome spend must match usage")
            if ratio.get("accepted_outcome_count") != count:
                errors.append("cost-per-outcome denominator must match accepted outcomes")
            quotient = ratio.get("quotient_micros")
            remainder = ratio.get("remainder_micros")
            if not _integer(quotient) or not _integer(remainder):
                errors.append("cost-per-outcome quotient and remainder must be nonnegative")
            elif remainder >= count or (
                quotient * count + remainder != usage.get("spend_micros")
            ):
                errors.append("cost-per-outcome ratio must preserve exact integer spend")

    promotion_fields = {
        "decision",
        "source_interaction_hashes",
        "privacy_profile_ref",
        "opt_in_receipt_ref",
        "privacy_scan_receipt_ref",
        "redaction_receipt_ref",
        "human_approval_receipt_ref",
        "eval_candidate_ref",
        "destination",
        "retention_days",
        "automatic_production_mutation",
        "automatic_schema_mutation",
        "automatic_skill_mutation",
    }
    promotion = receipt.get("interaction_to_eval")
    if not _exact_fields(promotion, promotion_fields):
        errors.append("interaction_to_eval fields are incomplete or contain raw content")
        promotion = {}
    if any(key in RAW_INTERACTION_KEYS for key, _ in _walk(receipt)):
        errors.append("runtime governance receipts cannot contain raw interaction content")
    source_hashes = promotion.get("source_interaction_hashes")
    if not (
        isinstance(source_hashes, list)
        and len(source_hashes) == len(set(source_hashes))
        and all(isinstance(item, str) and SHA256.fullmatch(item) for item in source_hashes)
    ):
        errors.append("interaction sources must be unique SHA-256 references")
    for field in (
        "automatic_production_mutation",
        "automatic_schema_mutation",
        "automatic_skill_mutation",
    ):
        if promotion.get(field) is not False:
            errors.append(f"interaction-to-eval {field} must remain false")
    decision = promotion.get("decision")
    decisions = {
        "NOT_REQUESTED",
        "DENIED_PRIVACY",
        "DENIED_CONSENT",
        "AWAITING_HUMAN_APPROVAL",
        "PROMOTED_TO_EVAL_QUARANTINE",
    }
    if decision not in decisions:
        errors.append("interaction-to-eval decision is invalid")
    promotion_refs = (
        "privacy_profile_ref",
        "opt_in_receipt_ref",
        "privacy_scan_receipt_ref",
        "redaction_receipt_ref",
        "human_approval_receipt_ref",
    )
    if decision == "PROMOTED_TO_EVAL_QUARANTINE":
        if not source_hashes:
            errors.append("eval promotion requires a hashed interaction source")
        for field in promotion_refs:
            if not _artifact_ref(promotion.get(field)):
                errors.append(f"eval promotion requires {field}")
        if promotion.get("destination") != promotion_policy.get("allowed_destination"):
            errors.append("eval promotion destination must be the declared quarantine")
        if not _artifact_ref(promotion.get("eval_candidate_ref")):
            errors.append("eval promotion requires a quarantined candidate reference")
        retention = promotion.get("retention_days")
        if not _integer(retention, minimum=1) or (
            _integer(promotion_policy.get("max_retention_days"), minimum=1)
            and retention > promotion_policy["max_retention_days"]
        ):
            errors.append("eval promotion retention exceeds the policy")
    elif any(promotion.get(field) is not None for field in (
        "destination", "eval_candidate_ref", "retention_days"
    )):
        errors.append("non-promotion decisions cannot carry an eval destination")

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
    try:
        policy = load_json(RUNTIME_GOVERNANCE_POLICY_EXAMPLE)
        receipt = load_json(RUNTIME_GOVERNANCE_RECEIPT_EXAMPLE)
        errors.extend(validate_runtime_governance(policy, receipt))
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
    print("  governance: hard runtime caps, measured cache, and eval quarantine")
    return 0 if args.strict else 0


if __name__ == "__main__":
    raise SystemExit(main())
