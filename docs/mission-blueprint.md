# Mission Blueprint and Agent Handoff

## Purpose

The editable web blueprint makes the entire mission legible at repository
open. It is a projection and editor for the architecture contracts, not a
scheduler or a new architecture.

The forward-only lifecycle is:

```text
DRAFT -> VALIDATED -> STRUCTURE_CONFIRMED(hash)
      -> ALLOCATION_DRAFT -> HANDOFF_PENDING_RUNTIME_VALIDATION
      -> RUNTIME_CONTRACT_VALIDATED -> ADAPTER_READINESS -> WORKERS_READY
```

The browser stops at handoff export. The final three states belong to the
runtime Harness.

`blueprint/default-blueprint.json` is the canonical seed. It passes the same
strict Graph validator as other graph contracts. The root `index.html` embeds
an exact copy so the first view works without a build step or network request.

## Dynamic task intake

The opening Mission view now starts with a bounded task-intake card. It keeps
the beginner-friendly editor surface while making the dynamic multimedia
mission explicit:

- choose a task class, finite template, policy profile, and maximum node
  ceiling;
- enter content-addressed `artifact:` or `sha256:` references and requested
  deliverable IDs one per line;
- compile a local shadow preview that records classification evidence and a
  finite diamond topology without uploading media, calling a provider,
  launching an agent, or expanding the Graph; and
- review and confirm the resulting structure before any team handoff.

The preview is stored under the editable `task_spec` projection and is
invalidated whenever its inputs change. The versioned JSON Schemas, template
catalog, media-manifest example, six optional adapter descriptors, and strict
validator live under `blueprint/contracts`, `blueprint/task-template-registry.json`,
`blueprint/media-asset-manifest.example.json`, and
`blueprint/adapter-registry.json`. They define the future runtime boundary;
the static page remains a non-executing editor.

## Graph admission before team allocation

The next card turns the dependency-shape guidance in the [source X post](https://x.com/Argona0x/status/2082807844336771532)
into an editable preflight. It asks for dependency evidence, a partition
strategy, a coupling profile, structural hub IDs, a critical-path floor,
finite fan-out, request-rate limits, a coordination-tax ceiling, and an enabled
zero-token script gate. The preview reports one of `PARALLEL CANDIDATE`,
`SERIAL ONLY`, `RATE LIMIT EXCEEDED`, or `NEEDS INPUT` and stores a local
`graph-admission-preview/1.0` receipt. It never creates Graph nodes, calls a
provider, or starts an agent. The command gate emits the stricter
`graph-admission/1.0` receipt described in the contract registry.

For command-level evidence, run the deterministic gate against the actual
contract:

```powershell
python tools/graph_admission_gate.py blueprint/default-blueprint.json --strict
```

The gate derives width, hubs, critical path, serial work, and projected request
rate from the declared DAG. External trial numbers are treated as hypotheses
to measure locally, not as acceptance thresholds.

## Beginner Blocks mode

The first Graph view opens in **Blocks** mode. A first-time user can apply a
starter recipe or add a visible Clarify, Approval, Repeat safely, or Final
check block without drawing edges or editing JSON. The workspace shows the
canonical mission in topological levels, marks independent work explicitly,
and keeps Configure and Remove as native keyboard-operable buttons.

Blocks are not a second graph format. A block click creates a transient,
bounded command which `blueprint/model.js` compiles into a complete candidate
copy of the canonical `nodes`, `edges`, `joins`, and budgets. The compiler:

1. inserts or removes the block at one unambiguous typed connector;
2. computes and displays the required finite budget floor;
3. runs the complete client contract validator;
4. commits the candidate only when every invariant passes;
5. clears confirmation, handoff, adapter probes, and selected routes; and
6. emits a hash-bound edit receipt.

Starter recipes use the same transaction path, so one recipe is one undoable
operation. Undo and redo restore editable content only; they cannot resurrect
runtime authority even when the restored structure has a former hash.
Plain-language Configure changes use an `update-block` transaction as well;
an invalid value leaves the saved draft, hashes, and history unchanged. Each
successful transaction stores a bounded `BLOCK_TRANSACTION_CLIENT_VALIDATED`
receipt under `blueprint.events` with before/after Graph and command hashes,
`launch_authorized: false`, and an explicit authority-reset flag.

The Approval block is a real typed gate: it consumes the incoming contract,
writes one durable approval artifact, and emits a verification edge carrying
an `approval_receipt`. Removing it restores the original connector and target
input atomically.

**Advanced** mode exposes the complete node, edge, join, workstream, and raw
JSON controls over that same canonical object. The initial beginner catalog
intentionally excludes external effects and arbitrary worker creation. A new
worker must create its Graph node, workstream, capability route, integration
reference, budgets, verifier, recovery path, and durable artifact together;
the interface will not offer a half-valid shortcut.

## Editable domains

Blocks mode guides common planning and evidence edits. Advanced mode edits:

- mission title, summary, objective, non-goals, and success criteria;
- node identity, kind, owner, payloads, reads, writes, verifier, budgets,
  effects, idempotency, compensation, label, and summary;
- typed edges and their endpoints, schemas, conditions, and types;
- joins, input sets, targets, modes, and verifiers;
- team commander, integration owner, topology, admission value, orchestration
  tax, checkpointing, interrupt policy, IPC, workstreams, isolated territory,
  artifacts, dependencies, verifiers, budgets, and stop conditions;
- Claude Code, Codex, Antigravity, Grok, Kimi, and DeepSeek adapter
  declarations, opaque connection references, declared capabilities,
  workspace modes, permission profiles, concurrency, and the shared IPC
  protocol;
- capability-only route requests. They deliberately contain no selected or
  preferred adapter;
- theme, accent, density, direction, visibility preferences, and raw JSON.

Text-list controls support add, remove, and reorder through one-item-per-line
editing. Raw JSON exposes the remaining versioned fields. User content is
assigned through form values or `textContent`; imported HTML, CSS, and
JavaScript are never executed.

## Confirmation boundary

The browser validates the static invariants and computes a Graph SHA-256 over
mission and Graph semantics. Presentation and team-allocation drafts are
excluded from that structure hash. A separate command SHA-256 covers the Agent
Team command, adapter roster, capability route requests, and canonical IPC
contract.

A confirmation receipt records:

- schema version and graph ID;
- the current canonical structure hash;
- a hash-bound client-validation result;
- confirming human and timestamp;
- `HUMAN_CONFIRMED` status.

Any mission or Graph edit invalidates the receipt, clears a prepared handoff,
and relocks allocation. An import always discards imported confirmation and
handoff state, even when its JSON is otherwise valid.

The browser never emits a process exit code or claims command evidence.
Its validation is immediate drafting guidance. The exported handoff embeds the
exact `graph_contract` and `command` used for the two declared hashes and
remains `PENDING_RUNTIME_VALIDATION`. An execution harness must run:

```powershell
python tools/validate_mission_handoff.py <handoff.json> `
  --receipt <runtime-validation-receipt.json>
```

That deterministic gate extracts both embedded contracts, validates the
adapter/route/IPC declaration, runs the strict Graph validator, recomputes both
stable SHA-256 values, and atomically emits a
`RUNTIME_CONTRACT_VALIDATED` receipt. The receipt always has
`launch_authorized: false`; it proves contract integrity, not endpoint health.
Running the strict Graph command directly against
`blueprint/default-blueprint.json` validates only the canonical seed, not a
browser-edited draft or its team command.

## Runtime adapter readiness

The named systems are optional adapter descriptors in the declared registry:

- Claude Code, Codex, Antigravity, Grok, Kimi, and DeepSeek are presented as
  declared, unverified candidates until the Harness probes them.

The current static editor keeps its original three editable roster entries for
backward-compatible handoff drafts and shows all six registry candidates as a
separate declared strip. Runtime selection remains capability-based and
provider-neutral; the registry never authorizes execution or stores secrets.

Those descriptions are declared capabilities for this mission, not universal
provider claims or durable work assignments. Graph node and workstream owners
remain capability roles. Route requests specify required capabilities,
workspace mode, and permission profile, but no adapter ID. After contract
validation, the Harness-owned `adapter-readiness` node must:

1. probe every required adapter through its opaque runtime reference;
2. resolve capability-compatible routes for the current run;
3. prove workspace isolation and permission profiles;
4. initialize the append-only, hash-chained IPC ledger;
5. bind its readiness receipt to both the Graph and command hashes.

The static browser always stores `UNVERIFIED`, empty route resolution, and null
probe/readiness receipts. Imports reset those fields. Credentials, tokens, API
keys, passwords, endpoint URLs, and launch commands are not blueprint data.
The browser and runtime handoff validators also reject any roster adapter ID,
case-insensitively, when it appears as a durable Graph, command, workstream,
route, or integration owner.

## Agent Team boundary

Only the post-adapter-readiness `agent` and `agent-team` work is represented as
independently ownable workstreams. Each workstream maps one-to-one to its
reachable Graph node and must preserve that node's owner, inputs, output
artifact, dependency order, and budget caps. Deterministic and human-gate
nodes are not turned into teammates.

The default command program admits three streams:

1. one isolated interface builder;
2. one independent Graph and architecture-contract reviewer;
3. one independent experience and accessibility reviewer.

They use capability descriptions, exclusive territories or receipt artifacts,
finite budgets, typed IPC, objective verifiers, explicit stop conditions, and
one serial integration owner. Adapters translate native events into a shared
`agent-team-ipc/1.0` JSONL envelope and exchange content-addressed artifacts,
not vendor chat transcripts. The exported handoff carries both expected
hashes, empty validation/readiness receipts, and no credentials. It never
launches a process, invokes a model, schedules work, changes permissions,
claims the strict validator ran, or certifies completion.

## Persistence and recovery

Local drafts use a versioned storage envelope. Storage denial, quota failure,
corruption, and cross-tab changes produce visible warnings without replacing
the in-memory draft. Export JSON before clearing browser data or switching
machines.

A saved draft that has the minimum contract shape but does not currently pass
validation is reopened in repair mode with its issues visible; the browser no
longer silently discards that work. Corrupt or incomplete storage still falls
back to the canonical seed with an announced warning. History is bounded and
sanitized through the same authority-reset boundary as import.

Import limits are 1 MiB, 24 nesting levels, 512 items per array, and 20,000
characters per string. Forbidden prototype keys are rejected before the
current draft changes.

The canonical JSON, repository checkpoints, event ledgers, workstream
artifacts, integration receipt, and cleanup receipt remain the durable
execution artifacts. Browser local storage is a drafting convenience, not
runtime graph state.
