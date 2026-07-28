from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


ROOT = Path(__file__).resolve().parents[1]
GRAPH_VALIDATOR = (
    ROOT
    / "skills"
    / "graph-engineering"
    / "scripts"
    / "validate_graph_contract.py"
)
MAX_HANDOFF_BYTES = 2 * 1024 * 1024
STRICT_COMMAND_TEMPLATE = (
    "python skills/graph-engineering/scripts/validate_graph_contract.py "
    "<extracted-graph-contract.json> --strict"
)
REQUIRED_ADAPTER_IDS = {"claude", "antigravity", "codex"}
REQUIRED_IPC_FIELDS = {
    "message_id",
    "run_id",
    "message_type",
    "task_id",
    "workstream_id",
    "graph_node_id",
    "sender_owner",
    "sender_adapter_id",
    "recipient_owner",
    "recipient_adapter_id",
    "sequence",
    "sent_at",
    "state",
    "artifact",
    "evidence",
    "decision",
    "unknowns",
    "dependency",
    "next_action",
    "contract_sha256",
    "command_sha256",
    "previous_message_sha256",
    "message_sha256",
}
FORBIDDEN_BINDING_FIELDS = {
    "model",
    "provider",
    "vendor",
    "adapter_id",
    "preferred_adapter_id",
    "selected_adapter_id",
    "runtime_adapter",
}
SECRET_KEY_PARTS = (
    "api_key",
    "apikey",
    "access_token",
    "refresh_token",
    "password",
    "client_secret",
    "credential",
)


def stable_stringify(value: Any) -> str:
    """Match BlueprintModel.stableStringify for JSON-compatible contracts."""
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )


def sha256_json(value: Any) -> str:
    return hashlib.sha256(stable_stringify(value).encode("utf-8")).hexdigest()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _non_empty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _unique_strings(value: Any, allow_empty: bool = False) -> bool:
    return (
        isinstance(value, list)
        and (allow_empty or bool(value))
        and all(_non_empty_string(item) for item in value)
        and len(set(value)) == len(value)
    )


def _contains_secret_field(value: Any) -> bool:
    if isinstance(value, list):
        return any(_contains_secret_field(item) for item in value)
    if not isinstance(value, dict):
        return False
    for key, nested in value.items():
        normalized = key.lower().replace("-", "_")
        if any(part in normalized for part in SECRET_KEY_PARTS):
            return True
        if _contains_secret_field(nested):
            return True
    return False


def _adapter_covers(adapter: Dict[str, Any], request: Dict[str, Any]) -> bool:
    capabilities = set(adapter.get("declared_capabilities", []))
    workspaces = set(adapter.get("supported_workspace_modes", []))
    permissions = set(adapter.get("supported_permission_profiles", []))
    return (
        adapter.get("enabled") is True
        and set(request.get("required_capabilities", [])).issubset(capabilities)
        and request.get("workspace_mode") in workspaces
        and request.get("permission_profile") in permissions
    )


def _command_contract_errors(command: Any) -> List[str]:
    errors: List[str] = []
    if not isinstance(command, dict):
        return ["command must be an object"]
    if command.get("schema_version") != "1.1":
        errors.append("command schema_version must be 1.1")
    if command.get("handoff") is not None:
        errors.append("command.handoff must be null")
    if _contains_secret_field(command.get("agent_roster", {})):
        errors.append("adapter roster contains a forbidden secret field")
    if _contains_secret_field(command.get("routing", {})):
        errors.append("routing contract contains a forbidden secret field")

    ipc = command.get("ipc_contract")
    if not isinstance(ipc, dict):
        errors.append("command.ipc_contract must be an object")
        ipc = {}
    protocol = ipc.get("protocol")
    if protocol != "agent-team-ipc/1.0":
        errors.append("IPC protocol must be agent-team-ipc/1.0")
    if ipc.get("transport") != "append-only-jsonl":
        errors.append("IPC transport must be append-only-jsonl")
    envelope = ipc.get("required_envelope_fields")
    if not _unique_strings(envelope) or not REQUIRED_IPC_FIELDS.issubset(
        set(envelope or [])
    ):
        errors.append("IPC envelope fields are incomplete")

    roster = command.get("agent_roster")
    if not isinstance(roster, dict):
        errors.append("command.agent_roster must be an object")
        roster = {}
    required_ids = roster.get("required_adapter_ids")
    if not _unique_strings(required_ids) or not REQUIRED_ADAPTER_IDS.issubset(
        set(required_ids or [])
    ):
        errors.append("required adapter ids must include claude, antigravity, and codex")
    adapters = roster.get("adapters")
    if not isinstance(adapters, list):
        errors.append("agent roster adapters must be an array")
        adapters = []
    adapter_map: Dict[str, Dict[str, Any]] = {}
    for index, adapter in enumerate(adapters):
        if not isinstance(adapter, dict):
            errors.append(f"adapter[{index}] must be an object")
            continue
        adapter_id = adapter.get("id")
        if not _non_empty_string(adapter_id):
            errors.append(f"adapter[{index}].id is required")
            continue
        if adapter_id in adapter_map:
            errors.append(f"duplicate adapter id: {adapter_id}")
        adapter_map[adapter_id] = adapter
        if adapter.get("enabled") is not True:
            errors.append(f"adapter {adapter_id} must be enabled in the declaration")
        if adapter.get("launch_mode") != "harness-managed":
            errors.append(f"adapter {adapter_id} launch must be Harness-managed")
        if adapter.get("connection_ref") != f"runtime.adapters.{adapter_id}":
            errors.append(f"adapter {adapter_id} connection_ref must be opaque")
        if adapter.get("ipc_protocol_version") != protocol:
            errors.append(f"adapter {adapter_id} IPC protocol is incompatible")
        if not _unique_strings(adapter.get("declared_capabilities")):
            errors.append(f"adapter {adapter_id} capabilities are invalid")
        if not _unique_strings(adapter.get("supported_workspace_modes")):
            errors.append(f"adapter {adapter_id} workspace modes are invalid")
        if not _unique_strings(adapter.get("supported_permission_profiles")):
            errors.append(f"adapter {adapter_id} permission profiles are invalid")
        runtime_state = adapter.get("runtime_state")
        if not isinstance(runtime_state, dict) or runtime_state.get(
            "status"
        ) != "UNVERIFIED" or runtime_state.get("probe_receipt") is not None:
            errors.append(
                f"adapter {adapter_id} must remain UNVERIFIED with no browser receipt"
            )
    for adapter_id in REQUIRED_ADAPTER_IDS:
        if adapter_id not in adapter_map:
            errors.append(f"required adapter missing: {adapter_id}")

    workstreams = command.get("workstreams")
    if not isinstance(workstreams, list) or len(workstreams) < 2:
        errors.append("command.workstreams must contain independently ownable work")
        workstreams = []
    stream_map: Dict[str, Dict[str, Any]] = {}
    for index, stream in enumerate(workstreams):
        if not isinstance(stream, dict):
            errors.append(f"workstream[{index}] must be an object")
            continue
        if FORBIDDEN_BINDING_FIELDS.intersection(stream):
            errors.append(f"workstream[{index}] contains a fixed runtime binding")
        stream_id = stream.get("id")
        if not _non_empty_string(stream_id):
            errors.append(f"workstream[{index}].id is required")
        elif stream_id in stream_map:
            errors.append(f"duplicate workstream id: {stream_id}")
        else:
            stream_map[stream_id] = stream

    routing = command.get("routing")
    if not isinstance(routing, dict):
        errors.append("command.routing must be an object")
        routing = {}
    if routing.get("selection_policy") != "capability-match-at-runtime":
        errors.append("routing must select by capability at runtime")
    if routing.get("require_runtime_probe") is not True:
        errors.append("routing must require a runtime probe")
    route_requests = routing.get("route_requests")
    if not isinstance(route_requests, list):
        errors.append("routing.route_requests must be an array")
        route_requests = []
    request_ids = set()
    for index, request in enumerate(route_requests):
        if not isinstance(request, dict):
            errors.append(f"route_request[{index}] must be an object")
            continue
        if FORBIDDEN_BINDING_FIELDS.intersection(request):
            errors.append(f"route_request[{index}] pre-binds a runtime adapter")
        if "territory" in request:
            errors.append(f"route_request[{index}] may not expand territory")
        stream_id = request.get("workstream_id")
        stream = stream_map.get(stream_id)
        if stream_id in request_ids:
            errors.append(f"duplicate route request: {stream_id}")
        request_ids.add(stream_id)
        if stream is None:
            errors.append(f"unknown route workstream: {stream_id}")
        elif (
            request.get("graph_node_id") != stream.get("graph_node_id")
            or request.get("capability_owner") != stream.get("owner")
        ):
            errors.append(f"route ownership mismatch: {stream_id}")
        if not _unique_strings(request.get("required_capabilities")):
            errors.append(f"route capabilities are invalid: {stream_id}")
        if not any(_adapter_covers(adapter, request) for adapter in adapters):
            errors.append(f"no adapter covers route request: {stream_id}")
    for stream_id in stream_map:
        if stream_id not in request_ids:
            errors.append(f"missing route request: {stream_id}")

    orchestration = routing.get("orchestration_request")
    if not isinstance(orchestration, dict) or orchestration.get("serial") is not True:
        errors.append("serial orchestration request is required")
    elif not any(_adapter_covers(adapter, orchestration) for adapter in adapters):
        errors.append("no adapter covers serial orchestration")
    resolution = routing.get("resolution")
    if (
        not isinstance(resolution, dict)
        or resolution.get("status") != "PENDING_HARNESS_PROBE"
        or resolution.get("selected_routes") != []
        or resolution.get("receipt") is not None
    ):
        errors.append("browser export cannot claim resolved adapter routes")
    return errors


def _durable_owner_binding_errors(
    graph: Dict[str, Any],
    command: Dict[str, Any],
) -> List[str]:
    roster = command.get("agent_roster")
    adapters = roster.get("adapters", []) if isinstance(roster, dict) else []
    adapter_ids = {
        adapter.get("id").strip().lower()
        for adapter in adapters
        if isinstance(adapter, dict) and _non_empty_string(adapter.get("id"))
    }
    owners: List[Tuple[str, Any]] = [
        ("graph.owner", graph.get("owner")),
        ("command.commander", command.get("commander")),
        ("command.integration_owner", command.get("integration_owner")),
    ]
    nodes = graph.get("nodes")
    if isinstance(nodes, list):
        owners.extend(
            (f"graph.nodes[{index}].owner", node.get("owner"))
            for index, node in enumerate(nodes)
            if isinstance(node, dict)
        )
    workstreams = command.get("workstreams")
    if isinstance(workstreams, list):
        owners.extend(
            (f"command.workstreams[{index}].owner", stream.get("owner"))
            for index, stream in enumerate(workstreams)
            if isinstance(stream, dict)
        )
    routing = command.get("routing")
    if isinstance(routing, dict):
        requests = routing.get("route_requests")
        if isinstance(requests, list):
            owners.extend(
                (
                    f"command.routing.route_requests[{index}].capability_owner",
                    request.get("capability_owner"),
                )
                for index, request in enumerate(requests)
                if isinstance(request, dict)
            )
        orchestration = routing.get("orchestration_request")
        if isinstance(orchestration, dict):
            owners.append(
                (
                    "command.routing.orchestration_request.capability_owner",
                    orchestration.get("capability_owner"),
                )
            )
    return [
        f"{path} must be a capability role, not runtime adapter id {value}"
        for path, value in owners
        if _non_empty_string(value) and value.strip().lower() in adapter_ids
    ]


def _base_receipt(handoff: Any) -> Dict[str, Any]:
    document = handoff if isinstance(handoff, dict) else {}
    return {
        "schema_version": "1.1",
        "status": "RUNTIME_VALIDATION_FAILED",
        "failure_status": "HANDOFF_CONTRACT_INVALID",
        "handoff_id": document.get("handoff_id", ""),
        "graph_id": "",
        "contract_sha256": document.get("contract_sha256", ""),
        "command_sha256": document.get("command_sha256", ""),
        "handoff_sha256": sha256_json(document),
        "validator_exit_code": None,
        "command": STRICT_COMMAND_TEMPLATE,
        "command_contract_validated": False,
        "adapter_readiness_status": "REQUIRED",
        "launch_authorized": False,
        "finished_at": utc_now(),
        "errors": [],
        "validator_stdout": "",
        "validator_stderr": "",
    }


def _binding_errors(
    handoff: Any,
) -> Tuple[
    List[str],
    Optional[Dict[str, Any]],
    Optional[Dict[str, Any]],
]:
    errors: List[str] = []
    if not isinstance(handoff, dict):
        return ["handoff must be a JSON object"], None, None

    graph_contract = handoff.get("graph_contract")
    if not isinstance(graph_contract, dict):
        errors.append("graph_contract must be an object")
        graph_contract = None
    command_contract = handoff.get("command")
    if not isinstance(command_contract, dict):
        errors.append("command must be an object")
        command_contract = None

    expected_hash = handoff.get("contract_sha256")
    if not _non_empty_string(expected_hash):
        errors.append("contract_sha256 is required")
    expected_command_hash = handoff.get("command_sha256")
    if not _non_empty_string(expected_command_hash):
        errors.append("command_sha256 is required")

    if handoff.get("status") != "PENDING_RUNTIME_VALIDATION":
        errors.append("handoff status must be PENDING_RUNTIME_VALIDATION")
    if handoff.get("schema_version") != "1.1":
        errors.append("handoff schema_version must be 1.1")

    confirmation = handoff.get("confirmation_receipt")
    if not isinstance(confirmation, dict):
        errors.append("confirmation_receipt must be an object")
    else:
        if confirmation.get("status") != "HUMAN_CONFIRMED":
            errors.append("confirmation_receipt must be HUMAN_CONFIRMED")
        if confirmation.get("contract_sha256") != expected_hash:
            errors.append("confirmation receipt hash does not match handoff hash")
        client_validation = confirmation.get("client_validation")
        if not isinstance(client_validation, dict):
            errors.append("confirmation client_validation must be an object")
        else:
            if client_validation.get("status") != "PASSED":
                errors.append("confirmation client validation did not pass")
            if client_validation.get("contract_sha256") != expected_hash:
                errors.append("client validation hash does not match handoff hash")

    runtime = handoff.get("runtime_validation")
    if not isinstance(runtime, dict):
        errors.append("runtime_validation must be an object")
    else:
        if runtime.get("status") != "REQUIRED":
            errors.append("runtime_validation status must be REQUIRED")
        if runtime.get("contract_locator") != "handoff.graph_contract":
            errors.append("runtime_validation must target handoff.graph_contract")
        if runtime.get("command_locator") != "handoff.command":
            errors.append("runtime_validation must target handoff.command")
        if runtime.get("expected_contract_sha256") != expected_hash:
            errors.append("runtime validation hash does not match handoff hash")
        if runtime.get("expected_command_sha256") != expected_command_hash:
            errors.append("runtime command hash does not match handoff command hash")
        if runtime.get("receipt") is not None:
            errors.append("an exported handoff cannot supply its own runtime receipt")

    if graph_contract is not None:
        actual_hash = sha256_json(graph_contract)
        if actual_hash != expected_hash:
            errors.append(
                "embedded graph_contract hash does not match contract_sha256"
            )
        graph_id = graph_contract.get("graph_id")
        if not _non_empty_string(graph_id):
            errors.append("embedded graph_contract graph_id is required")
        elif isinstance(confirmation, dict) and confirmation.get("graph_id") != graph_id:
            errors.append("confirmation graph_id does not match graph_contract")

    if command_contract is not None:
        actual_command_hash = sha256_json(command_contract)
        if actual_command_hash != expected_command_hash:
            errors.append(
                "embedded command hash does not match command_sha256"
            )
        errors.extend(_command_contract_errors(command_contract))
    if graph_contract is not None and command_contract is not None:
        errors.extend(
            _durable_owner_binding_errors(graph_contract, command_contract)
        )

    readiness = handoff.get("adapter_readiness")
    if not isinstance(readiness, dict):
        errors.append("adapter_readiness must be an object")
    else:
        if readiness.get("status") != "REQUIRED":
            errors.append("adapter_readiness status must be REQUIRED")
        if readiness.get("launch_authorized") is not False:
            errors.append("browser handoff cannot authorize launch")
        if readiness.get("browser_claims_endpoint_health") is not False:
            errors.append("browser handoff cannot claim endpoint health")
        if readiness.get("receipt") is not None:
            errors.append("browser handoff cannot provide an adapter readiness receipt")
        readiness_ids = readiness.get("required_adapter_ids")
        if not _unique_strings(readiness_ids) or not REQUIRED_ADAPTER_IDS.issubset(
            set(readiness_ids or [])
        ):
            errors.append("adapter_readiness must require all three adapters")
        if command_contract is not None:
            command_roster = command_contract.get("agent_roster")
            command_required_ids = (
                command_roster.get("required_adapter_ids")
                if isinstance(command_roster, dict)
                else None
            )
            if readiness_ids != command_required_ids:
                errors.append("adapter readiness ids do not match the command roster")
        if (
            command_contract is not None
            and readiness.get("node_id")
            != command_contract.get("adapter_readiness_node")
        ):
            errors.append("adapter readiness node does not match the command")

    return errors, graph_contract, command_contract


def validate_handoff_document(handoff: Any) -> Dict[str, Any]:
    receipt = _base_receipt(handoff)
    errors, graph_contract, command_contract = _binding_errors(handoff)
    receipt["errors"] = errors
    if errors or graph_contract is None or command_contract is None:
        receipt["finished_at"] = utc_now()
        return receipt

    receipt["graph_id"] = graph_contract["graph_id"]
    receipt["command_contract_validated"] = True
    with tempfile.TemporaryDirectory(prefix="mission-handoff-") as temp_dir:
        contract_path = Path(temp_dir) / "extracted-graph-contract.json"
        contract_path.write_text(
            json.dumps(graph_contract, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        result = subprocess.run(
            [
                sys.executable,
                str(GRAPH_VALIDATOR),
                str(contract_path),
                "--strict",
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )

    receipt["validator_exit_code"] = result.returncode
    receipt["validator_stdout"] = result.stdout.strip()
    receipt["validator_stderr"] = result.stderr.strip()
    receipt["finished_at"] = utc_now()
    if result.returncode == 0:
        receipt["status"] = "RUNTIME_CONTRACT_VALIDATED"
        receipt["failure_status"] = ""
    else:
        receipt["failure_status"] = "STRICT_GRAPH_VALIDATION_FAILED"
        receipt["errors"].append("strict Graph validation failed")
    return receipt


def load_handoff(path: Path) -> Any:
    if path.stat().st_size > MAX_HANDOFF_BYTES:
        raise ValueError("handoff is larger than 2 MiB")
    return json.loads(path.read_text(encoding="utf-8"))


def write_receipt(path: Path, receipt: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.",
        suffix=".tmp",
        dir=str(path.parent),
        text=True,
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(receipt, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_name, path)
    except Exception:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass
        raise


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Validate the exact Graph and Agent Team command contracts embedded "
            "in a handoff. This never proves adapter readiness or authorizes launch."
        )
    )
    parser.add_argument("handoff", type=Path, help="Exported handoff JSON")
    parser.add_argument(
        "--receipt",
        type=Path,
        help="Optional durable receipt path; JSON is always printed to stdout.",
    )
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    try:
        handoff = load_handoff(args.handoff)
        receipt = validate_handoff_document(handoff)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        receipt = _base_receipt({})
        receipt["errors"] = [str(error)]
        receipt["finished_at"] = utc_now()

    if args.receipt is not None:
        write_receipt(args.receipt, receipt)
    print(json.dumps(receipt, ensure_ascii=False, indent=2))
    return 0 if receipt["status"] == "RUNTIME_CONTRACT_VALIDATED" else 1


if __name__ == "__main__":
    raise SystemExit(main())
