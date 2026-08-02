"""Run a deterministic, read-only Graph admission preflight.

The gate measures dependency width from the declared Graph contract before a
planner or Agent Team is allowed to fan out. It identifies structural hubs,
computes the critical-path floor, applies finite fan-out and request-rate
caps, and records a zero-token planner-gate receipt. It never edits the Graph,
starts a worker, or treats benchmark claims from an external source as local
evidence.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import time
from collections import Counter, deque
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


ROOT = Path(__file__).resolve().parents[1]
GRAPH_VALIDATOR = ROOT / "skills" / "graph-engineering" / "scripts" / "validate_graph_contract.py"

DEPENDENCY_SOURCES = {"static-analysis", "declared-graph", "manual", "unknown"}
PARTITION_STRATEGIES = {"dependency-cut", "serial-critical-path", "maker-checker", "manual"}
COUPLING_PROFILES = {"independent", "mixed", "coupled", "needs-input"}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_graph_validator():
    spec = importlib.util.spec_from_file_location("graph_admission_validator", GRAPH_VALIDATOR)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load Graph validator: {GRAPH_VALIDATOR}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def validate_graph(contract: Dict[str, Any]) -> List[str]:
    return list(load_graph_validator().validate(contract, strict=True))


def _graph_shape(contract: Dict[str, Any]) -> Tuple[List[str], Dict[str, List[str]], Dict[str, List[str]], List[str]]:
    nodes = contract.get("nodes", [])
    ids = [str(node.get("id")) for node in nodes]
    outgoing: Dict[str, List[str]] = {node_id: [] for node_id in ids}
    incoming: Dict[str, List[str]] = {node_id: [] for node_id in ids}
    for edge in contract.get("edges", []):
        source = str(edge.get("from"))
        target = str(edge.get("to"))
        if source in outgoing and target in incoming:
            outgoing[source].append(target)
            incoming[target].append(source)
    indegree = {node_id: len(incoming[node_id]) for node_id in ids}
    queue = deque(sorted(node_id for node_id, count in indegree.items() if count == 0))
    order: List[str] = []
    while queue:
        node_id = queue.popleft()
        order.append(node_id)
        for target in sorted(outgoing[node_id]):
            indegree[target] -= 1
            if indegree[target] == 0:
                queue.append(target)
    return ids, outgoing, incoming, order


def _durations(contract: Dict[str, Any]) -> Dict[str, float]:
    return {
        str(node.get("id")): float(node.get("timeout_seconds") or 0)
        for node in contract.get("nodes", [])
    }


def _critical_path_seconds(contract: Dict[str, Any], order: Iterable[str], incoming: Dict[str, List[str]]) -> float:
    durations = _durations(contract)
    completion: Dict[str, float] = {}
    for node_id in order:
        predecessor_finish = max((completion.get(parent, 0.0) for parent in incoming[node_id]), default=0.0)
        completion[node_id] = predecessor_finish + durations.get(node_id, 0.0)
    terminals = [str(node_id) for node_id in contract.get("terminal_nodes", [])]
    values = [completion[node_id] for node_id in terminals if node_id in completion]
    return max(values or list(completion.values()) or [0.0])


def _parallel_width(order: Iterable[str], outgoing: Dict[str, List[str]], incoming: Dict[str, List[str]]) -> int:
    level: Dict[str, int] = {}
    for node_id in order:
        level[node_id] = max((level[parent] + 1 for parent in incoming[node_id]), default=0)
    counts = Counter(level.values())
    return max(counts.values() or [1])


def _structural_hubs(ids: Iterable[str], incoming: Dict[str, List[str]], outgoing: Dict[str, List[str]]) -> List[Dict[str, int]]:
    scored = []
    for node_id in ids:
        in_degree = len(incoming[node_id])
        out_degree = len(outgoing[node_id])
        score = in_degree * out_degree + in_degree + out_degree
        if score:
            scored.append({"node_id": node_id, "in_degree": in_degree, "out_degree": out_degree, "score": score})
    scored.sort(key=lambda item: (-item["score"], item["node_id"]))
    return scored[:16]


def _positive_float(value: float, fallback: float) -> float:
    return value if value > 0 else fallback


def analyze_contract(
    contract: Dict[str, Any],
    *,
    dependency_source: str = "declared-graph",
    partition_strategy: Optional[str] = None,
    coupling_profile: Optional[str] = None,
    fanout: Optional[int] = None,
    worker_rate_rps: float = 10.0,
    rate_limit_rps: float = 100.0,
    planner_gate: str = "script-preflight",
    coordination_tax_ceiling_percent: float = 30.0,
) -> Dict[str, Any]:
    started = time.perf_counter()
    errors = validate_graph(contract)
    ids, outgoing, incoming, order = _graph_shape(contract)
    if errors or len(order) != len(ids):
        elapsed_ms = (time.perf_counter() - started) * 1000
        return {
            "schema_version": "graph-admission/1.0",
            "status": "REJECT",
            "graph_id": str(contract.get("graph_id", "unknown")),
            "dependency_source": dependency_source if dependency_source in DEPENDENCY_SOURCES else "unknown",
            "partition_strategy": partition_strategy if partition_strategy in PARTITION_STRATEGIES else "manual",
            "coupling_profile": coupling_profile if coupling_profile in COUPLING_PROFILES else "needs-input",
            "critical_path_seconds": 0,
            "serial_work_seconds": 0,
            "critical_path_payback_seconds": 0,
            "peak_parallel_width": 1,
            "structural_hubs": [],
            "fanout_budget": {"requested": 1, "effective": 1, "graph_cap": 1},
            "rate_limit": {
                "worker_rate_rps": _positive_float(worker_rate_rps, 1.0),
                "limit_rps": _positive_float(rate_limit_rps, 1.0),
                "projected_rps": 0,
                "status": "UNKNOWN",
            },
            "planner_gate": {
                "mode": planner_gate if planner_gate in {"script-preflight", "disabled"} else "disabled",
                "status": "REJECT",
                "token_cost": 0,
                "elapsed_ms": round(elapsed_ms, 3),
            },
            "coordination_tax_ceiling_percent": max(0.0, min(100.0, float(coordination_tax_ceiling_percent))),
            "evidence": ["Strict Graph validation did not pass; admission is not authorized."],
            "reasons": errors or ["Graph topology could not be ordered deterministically."],
        }

    durations = _durations(contract)
    serial_seconds = sum(durations.values())
    critical_path = _critical_path_seconds(contract, order, incoming)
    payback = max(0.0, serial_seconds - critical_path)
    peak_width = _parallel_width(order, outgoing, incoming)
    hubs = _structural_hubs(ids, incoming, outgoing)
    graph_cap = max(1, int(contract.get("budgets", {}).get("max_concurrency") or 1))
    requested = max(1, int(fanout if fanout is not None else graph_cap))
    requested = min(requested, 256)
    effective = max(1, min(requested, graph_cap, peak_width))
    worker_rate = _positive_float(float(worker_rate_rps), 10.0)
    limit_rate = _positive_float(float(rate_limit_rps), 100.0)
    projected_rate = effective * worker_rate
    rate_status = "WITHIN_LIMIT" if projected_rate <= limit_rate else "EXCEEDS_LIMIT"
    source = dependency_source if dependency_source in DEPENDENCY_SOURCES else "unknown"
    coupling = coupling_profile if coupling_profile in COUPLING_PROFILES else None
    if not coupling:
        coupling = "independent" if peak_width > 1 and payback > 0 else "coupled"
    partition = partition_strategy if partition_strategy in PARTITION_STRATEGIES else None
    if not partition:
        partition = "serial-critical-path" if coupling == "coupled" or effective < 2 else "dependency-cut"
    gate_mode = planner_gate if planner_gate in {"script-preflight", "disabled"} else "disabled"
    elapsed_ms = (time.perf_counter() - started) * 1000

    reasons: List[str] = []
    if source == "unknown":
        reasons.append("Name the dependency evidence source before partitioning.")
    if rate_status == "EXCEEDS_LIMIT":
        reasons.append("Projected worker request rate exceeds the declared rate limit.")
    if gate_mode == "disabled":
        reasons.append("Enable the zero-token script preflight before planner allocation.")
    if coupling == "coupled" or effective < 2 or payback <= 0:
        reasons.append("Keep the work serial: added workers cannot shorten the measured dependency floor.")

    if source == "unknown" or gate_mode == "disabled":
        status = "NEEDS_INPUT"
    elif rate_status == "EXCEEDS_LIMIT":
        status = "RATE_LIMIT_EXCEEDED"
    elif coupling == "coupled" or effective < 2 or payback <= 0:
        status = "SERIAL_ONLY"
    else:
        status = "ADMIT"

    evidence = [
        f"Strict Graph validation passed for {contract.get('graph_id', 'unknown')}.",
        f"Dependency width: peak {peak_width} ready level(s); critical path {critical_path:.0f}s vs {serial_seconds:.0f}s serial work.",
        f"Structural hub candidates: {', '.join(item['node_id'] for item in hubs[:4]) or 'none'}.",
        f"Effective fan-out is capped at {effective}; projected request rate is {projected_rate:.1f}/s against {limit_rate:.1f}/s.",
        "Planner gate is deterministic and token-free; benchmark claims require local measurement.",
    ]
    if not reasons:
        reasons.append("The declared topology has measurable width within the finite rate and fan-out caps.")

    return {
        "schema_version": "graph-admission/1.0",
        "status": status,
        "graph_id": str(contract.get("graph_id", "unknown")),
        "dependency_source": source,
        "partition_strategy": partition,
        "coupling_profile": coupling,
        "critical_path_seconds": round(critical_path, 3),
        "serial_work_seconds": round(serial_seconds, 3),
        "critical_path_payback_seconds": round(payback, 3),
        "peak_parallel_width": peak_width,
        "structural_hubs": hubs,
        "fanout_budget": {"requested": requested, "effective": effective, "graph_cap": graph_cap},
        "rate_limit": {
            "worker_rate_rps": round(worker_rate, 3),
            "limit_rps": round(limit_rate, 3),
            "projected_rps": round(projected_rate, 3),
            "status": rate_status,
        },
        "planner_gate": {
            "mode": gate_mode,
            "status": "PASS" if gate_mode == "script-preflight" else "DISABLED",
            "token_cost": 0,
            "elapsed_ms": round(elapsed_ms, 3),
        },
        "coordination_tax_ceiling_percent": max(0.0, min(100.0, float(coordination_tax_ceiling_percent))),
        "evidence": evidence,
        "reasons": reasons,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("contract", type=Path, help="Graph contract JSON to analyze")
    parser.add_argument("--dependency-source", choices=sorted(DEPENDENCY_SOURCES), default="declared-graph")
    parser.add_argument("--partition-strategy", choices=sorted(PARTITION_STRATEGIES))
    parser.add_argument("--coupling-profile", choices=sorted(COUPLING_PROFILES))
    parser.add_argument("--fanout", type=int, help="Requested worker fan-out before the Graph cap")
    parser.add_argument("--worker-rate-rps", type=float, default=10.0)
    parser.add_argument("--rate-limit-rps", type=float, default=100.0)
    parser.add_argument("--planner-gate", choices=["script-preflight", "disabled"], default="script-preflight")
    parser.add_argument("--coordination-tax-ceiling", type=float, default=30.0)
    parser.add_argument("--output", type=Path, help="Optional JSON receipt output path")
    parser.add_argument("--strict", action="store_true", help="Fail when the graph cannot be admitted")
    return parser


def main(argv: Optional[List[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        contract = load_json(args.contract)
        receipt = analyze_contract(
            contract,
            dependency_source=args.dependency_source,
            partition_strategy=args.partition_strategy,
            coupling_profile=args.coupling_profile,
            fanout=args.fanout,
            worker_rate_rps=args.worker_rate_rps,
            rate_limit_rps=args.rate_limit_rps,
            planner_gate=args.planner_gate,
            coordination_tax_ceiling_percent=args.coordination_tax_ceiling,
        )
    except (OSError, json.JSONDecodeError, TypeError, ValueError) as exc:
        print(f"ERROR graph admission failed: {exc}")
        return 1
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(f"{receipt['status']} graph admission gate")
    print(f"- graph: {receipt['graph_id']}")
    print(f"- critical path: {receipt['critical_path_seconds']}s / serial work: {receipt['serial_work_seconds']}s")
    print(f"- hubs: {len(receipt['structural_hubs'])} / effective fan-out: {receipt['fanout_budget']['effective']}")
    print(f"- request rate: {receipt['rate_limit']['projected_rps']}/s / limit: {receipt['rate_limit']['limit_rps']}/s")
    if args.strict and receipt["status"] not in {"ADMIT", "SERIAL_ONLY"}:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
