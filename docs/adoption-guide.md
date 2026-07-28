# Adoption Guide

## Stage 0: Open, Edit, and Confirm the Mission

Open the root `index.html`, preferably through a local static server. Review
the whole mission before allocating work:

1. In the default **Blocks** view, choose a starter recipe or add one safe
   block at a time.
2. Configure the block name, completion check, finite time/attempt limit, and
   failure behavior. The compiler adds the compatible typed connector and
   previews any required budget floor as one atomic change.
3. Resolve each `Needs attention` link, use Undo/Redo as needed, and review the
   connected order and parallel levels. Use **Advanced** only for direct
   contract work.
4. Issue a human confirmation receipt for the exact displayed structure hash.
5. Review the declared Claude, Antigravity, and Codex adapters, capability-only
   route requests, workspace modes, permissions, and typed IPC contract.
6. Edit and export the capability-based Agent Team command.
7. Before worker recruitment, run `tools/validate_mission_handoff.py` against
   the pack. It validates the exact `graph_contract` and `command`, runs the
   strict Graph validator, and recomputes both stable hashes.
8. Have the Harness probe each required adapter, resolve routes by capability,
   verify isolation/permissions/IPC, and issue the separate
   `adapter_readiness_receipt`.

Any semantic mission or Graph edit invalidates the receipt and relocks team
handoff. Presentation-only changes do not. The browser prepares contracts and
handoff artifacts; it is not a scheduler and never claims runtime validation
or adapter readiness.

The beginner palette deliberately omits partial Work-block creation. Adding a
new independently owned stream requires one atomic Graph node + workstream +
capability route + integration update. Existing seed workstreams remain
editable after confirmation.

## Stage 1: Validate One Contract

Copy `skills/graph-engineering/references/diamond-graph-example.json`, replace
the objective and nodes, and run the strict validator. Do not execute the graph
until the static contract passes.

Required fields include:

- objective, non-goals, owner, entry nodes, and terminal nodes;
- finite graph and node budgets;
- typed node inputs and outputs;
- concrete reads and single-writer targets;
- explicit dependency and failure edges;
- join mode, exact input set, and join verifier;
- permission boundary, idempotency, compensation, and recovery;
- durable state, event, artifact, and receipt locations.

## Stage 2: Prove Admission Value

Measure sequential work, expected critical path, scheduler overhead, and review
load. Admit Graph only when the expected saving or failure-localization benefit
is bounded and observable. Use `experiments/graph-engineering/benchmark.py` as
a reference, not as universal performance evidence.

## Stage 3: Execute Locally

Implement deterministic nodes first. Persist a transition before releasing its
successors:

```text
PENDING -> READY -> RUNNING -> VERIFYING -> SUCCEEDED
                        |          |
                        v          v
                     RETRY       FAILED
```

Keep each node idempotent. Store edge payload locators and hashes rather than
copying full branch context into every successor.

## Stage 4: Add Adjacent Architectures

- Add Loop Engineering only inside nodes that need bounded temporal retries.
- Add Harness Engineering when a scheduler, lease, permission check, or event
  ledger is needed. Harness also owns runtime adapter discovery, probes,
  capability-route resolution, and endpoint dispatch.
- Add Agent Teams Command only for independently owned agent workstreams.
- Add Context Manager when checkpoint and retrieval discipline is necessary.
- Add Verify Before Claim before any external or completion claim.

## Stage 5: Consequential Effects

External, shared, destructive, published, credentialed, or financial effects
require:

1. An exact allowed write scope.
2. A typed approval receipt from a human gate.
3. Idempotency and duplicate-delivery behavior.
4. Compensation and a verified rollback route.
5. Independent terminal review.

## Production Gate

This repository supplies contracts, validators, examples, and bounded local
evidence. It is not a production graph scheduler. A production rollout still
needs a runtime harness, persistence backend, lease semantics, access control,
telemetry, and operational recovery tests.
