# Architecture Boundaries

## One-Sentence Model

Graph controls dependency width; Loop controls temporal depth; Agent Teams
controls process ownership; Harness controls runtime execution; Context carries
durable state; Verification controls completion claims.

## Presentation Boundary

The root mission blueprint renders and edits these contracts, but owns none of
their execution semantics. Node placement, color, preview arrows, and lifecycle
labels are presentation. Only the canonical JSON declares dependencies,
payloads, joins, budgets, owners, and recovery.

The beginner Blocks workspace is a presentation compiler, not another graph
authority. Its transient block commands must produce a complete candidate
canonical contract, show any finite budget increase, and pass the same Graph
and cross-contract checks before one atomic commit. Blocks and Advanced mode
therefore cannot diverge. Undo, redo, import, and semantic edits all clear
human confirmation, Agent Team handoff, adapter probes, and selected routes.

Browser validation is drafting feedback, not fresh command evidence. A
confirmation receipt unlocks Agent Team allocation for the matching Graph
hash, but it does not recruit workers. The exported pack carries separately
hash-bound Graph and Agent Team command contracts. A deterministic
runtime-validation node must validate both; a later Harness-owned
adapter-readiness node must probe the declared Claude, Antigravity, and Codex
adapters, resolve capability routes, and prove workspace, permission, and IPC
readiness before any Agent Team node becomes ready.

The source-aligned feedback arrow is presentation of bounded temporal review,
not a Graph cycle. Named adapter cards are runtime declarations, not durable
owners. Browser state always treats them as `UNVERIFIED`.

## MECE Ownership

| Question | Owner | Contract |
|---|---|---|
| Which output unlocks which node? | Graph Engineering | Typed edges and deterministic readiness |
| How are multiple inputs accepted? | Graph Engineering | Explicit join mode and verifier |
| What repeats until a finite stop? | Loop Engineering | Trigger, execute, verify, state |
| Who owns an independent workstream? | Agent Teams Command | Process owner, IPC, isolation, integration |
| Who dispatches tools and enforces permissions? | Harness Engineering | Scheduler, lease, permission, telemetry |
| Which ready runtime adapter handles a capability request? | Harness Engineering | Probe receipt, route receipt, workspace and permission profile |
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
- Harness may discover and probe adapters, resolve capability-compatible
  runtime routes, and schedule ready nodes, but it must not invent
  dependencies, workstream ownership, or join semantics.
- Adapter IDs, provider-native events, endpoints, and credentials never become
  Graph node or workstream fields. Adapters translate native events into the
  canonical Agent Teams IPC envelope.
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
