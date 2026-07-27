# Architecture Boundaries

## One-Sentence Model

Graph controls dependency width; Loop controls temporal depth; Agent Teams
controls process ownership; Harness controls runtime execution; Context carries
durable state; Verification controls completion claims.

## MECE Ownership

| Question | Owner | Contract |
|---|---|---|
| Which output unlocks which node? | Graph Engineering | Typed edges and deterministic readiness |
| How are multiple inputs accepted? | Graph Engineering | Explicit join mode and verifier |
| What repeats until a finite stop? | Loop Engineering | Trigger, execute, verify, state |
| Who owns an independent workstream? | Agent Teams Command | Process owner, IPC, isolation, integration |
| Who dispatches tools and enforces permissions? | Harness Engineering | Scheduler, lease, permission, telemetry |
| How does a long run survive compaction? | Context Manager | Checkpoint and payload locator |
| What proves the result? | Verify Before Claim | Fresh evidence and terminal receipt |
| When should autonomy use a graph? | Agentic Engineering | Admission and macro-action boundary |

## Routing Decision

1. Start with one-shot execution.
2. Add Loop when the same bounded action repeats through time.
3. Add Graph only when explicit dependencies, independent branches, typed
   joins, or node-local recovery have measurable value.
4. Add Harness when runtime scheduling, tools, permissions, or observability
   become an implementation concern.
5. Add Agent Teams only for genuinely independent process owners with explicit
   IPC and a serial integration owner.
6. Add Context Manager when the run exceeds one context window or edge payloads
   must be retrieved without branch transcripts.
7. Apply Verify Before Claim to every consequential terminal decision.

## Composition Rules

- A Graph node may be `deterministic`, `loop`, `agent`, `agent-team`,
  `human-gate`, or a bounded `subgraph`.
- A Loop inside a node may use OODA for local adaptation, but it must expose one
  typed node result to the graph.
- A Graph edge transports declared payloads, not private worker transcripts.
- Agent Teams may implement selected `agent` or `agent-team` nodes. It must not
  create a teammate for every node by default.
- Harness may schedule ready nodes, but it must not invent dependencies or join
  semantics.
- Verification must check node evidence, join evidence, terminal evidence, and
  checkpoint identity. Green nodes alone do not prove graph success.

## Static V7.1 Boundary

Supported topologies are sequence, pipeline, diamond, maker-checker, and
bounded subgraph. Cycles and runtime graph expansion are rejected. Put
repetition inside a finite Loop node. If the dependency structure cannot be
declared before execution, return `NEEDS_INPUT`, reduce scope, or use a
different orchestration model.

## Failure Locality

Recover the failed node or smallest invalid subgraph after changing diagnosis,
input, owner, tool, or strategy. Preserve verified branches and durable edge
payloads. Whole-graph replay is not an ordinary retry strategy.
