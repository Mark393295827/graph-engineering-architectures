# Graph Engineering Architectures - Agent Instructions

This repository is a focused extraction of the Graph Engineering architecture
and its adjacent execution contracts.

## Scope

- Graph Engineering owns bounded static DAG topology, typed edges, explicit
  joins, single writers, deterministic readiness, durable graph state, and
  node-local recovery.
- Loop Engineering owns temporal repetition.
- Agent Teams Command owns process ownership, IPC, isolated work, integration,
  and cleanup.
- Harness Engineering owns scheduling, permissions, leases, tools,
  observability, and production recovery.
- Context Manager owns context budgets, checkpoints, and payload transfer.
- Verify Before Claim owns evidence gates and completion claims.
- OODA Core is a node-local adaptation example, not graph topology.

Do not add dynamic graph expansion, graph cycles, hidden joins, overlapping
writers, unbounded retries, or whole-graph replay as a convenience.

## Change Contract

1. Update `architecture-manifest.json` when an architecture, relationship, or
   supporting asset changes.
2. Preserve upstream provenance for copied files.
3. Give every new graph behavior a finite budget, objective verifier, failure
   status, recovery path, and durable receipt.
4. Keep Graph, Loop, Teams, and Harness responsibilities MECE.
5. Add or update tests before claiming an invariant.

## Required Checks

```powershell
python -m unittest discover -s tools -p "test_*.py" -v
python -m unittest discover -s experiments/graph-engineering/tests -p "test_*.py" -v
python skills/graph-engineering/scripts/validate_graph_contract.py `
  skills/graph-engineering/references/diamond-graph-example.json --strict
python skills/loop-engineering/scripts/validate_loop_contract.py `
  skills/loop-engineering/references/ci-repair-loop-example.md --strict
node core/ooda/ooda_loop.test.js
```

Completion requires fresh command evidence and `git diff --check`.
