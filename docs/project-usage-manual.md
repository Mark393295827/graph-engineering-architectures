# Complete Project Usage Manual

This manual explains how to open, edit, validate, hand off, test, and extend
the entire Graph Engineering Architectures project. Start with the five-minute
workflow, then use the later sections when you need deeper control.

## What this project gives you

The repository has two complementary surfaces:

1. An editable, local-first mission blueprint in `index.html`.
2. A set of architecture contracts, validators, examples, tests, and reference
   implementations for executing bounded static dependency graphs safely.

The opening page lets a beginner assemble a mission with Lego-like blocks
without creating a second graph format. Every safe block compiles into the same
canonical JSON contract used by Advanced mode and the strict validator.

The legacy editor prepares an Agent Team command for Claude, Antigravity, and
Codex declarations. Phase 1 also adds a provider-neutral registry for Claude
Code, Codex, Antigravity, Grok, Kimi, and DeepSeek as future probe-gated
candidates. It does **not** contain a production scheduler, connect to model
endpoints, store credentials, or launch agents from the browser. Those runtime
duties belong to a separate Harness.

For the dynamic multimedia contract boundary, read
[`docs/dynamic-multimedia-blueprint.md`](dynamic-multimedia-blueprint.md).
The registry and schemas can be checked before any runtime work:

```powershell
python tools/validate_dynamic_contracts.py --strict
```

## Five-minute start

### 1. Check the prerequisites

You need:

- a modern web browser;
- Python 3.8 or newer for the local server and Python checks;
- Node.js with `node --test` support for the JavaScript checks;
- Git only if you want to clone, branch, or contribute.

Check the command-line tools:

```powershell
python --version
node --version
git --version
```

The web editor has no package installation and no build step.

### 2. Open the project

From the repository root:

```powershell
python -m http.server 8080
```

Open `http://localhost:8080/` in a browser. Press `Ctrl+C` in the terminal when
you want to stop the server.

You can also double-click `index.html`. The canonical seed is embedded in the
page for this direct-open fallback, but the local server gives more consistent
browser storage and file-loading behavior.

### Dynamic multimedia intake

The Mission view opens with a task-intake card before the structural diagram.
Use it when the mission depends on documents, images, audio, or other
cross-domain inputs:

1. Choose the task class, finite template, policy profile, and maximum node
   ceiling.
2. Enter one bounded `artifact:` or `sha256:` reference per line and one
   deliverable ID per line.
3. Select **Compile task preview**. This is a local shadow compile only: it
   records classification evidence and readiness for review, but it does not
   upload media, call a provider, launch an agent, or expand the Graph.
4. Review the finite Graph and confirm the structure. Changing any task-intake
   field invalidates the prior preview, so compile again before confirmation.

The Agent Team view shows six declared but unverified candidates—Claude Code,
Codex, Antigravity, Grok, Kimi, and DeepSeek. They are provider-neutral
capability hints until a later Harness probe produces a readiness receipt.

### Graph admission preflight

Before allocating those candidates, use the **Graph admission** card directly
below task intake. It makes the dependency shape explicit for beginners:

1. Choose the dependency evidence source. Prefer static analysis or the
   declared Graph; a folder/file list is not a dependency graph.
2. Choose **Dependency cut** (or a serial/maker-checker strategy), classify the
   work as independent, mixed, or coupled, and list structural hub IDs one per
   line. Isolate those hubs before fan-out.
3. Enter the critical-path floor in seconds, fan-out ceiling, worker request
   rate, upstream rate limit, and coordination-tax ceiling. These are finite
   budgets, not provider settings.
4. Keep **Script preflight · 0 tokens** enabled and select **Evaluate admission
   preview**.
5. Continue only when the result is **PARALLEL CANDIDATE**. **SERIAL ONLY** is
   a valid safe outcome for coupled work; **NEEDS INPUT** and **RATE LIMIT
   EXCEEDED** require edits before allocation.

The card is a browser preview and does not run a scheduler. To produce fresh
command evidence from the actual default DAG, run:

```powershell
python tools/graph_admission_gate.py blueprint/default-blueprint.json --strict
```

The gate measures the local graph's hub candidates, critical-path floor,
effective width, and projected request rate. The [linked research post](https://x.com/Argona0x/status/2082807844336771532)
provides useful hypotheses about dependency-aware partitioning, but its trial
numbers are not accepted as local evidence.

### 3. Build the mission

1. Open **Mission** and replace the objective, non-goals, and success criteria.
2. Open **Graph**. Keep the default **Blocks** mode for your first pass.
3. Apply one starter recipe or add one block.
4. Select a block and configure its name, completion check, and bounded
   behavior.
5. Select **Check my blocks** and resolve every visible issue.
6. Use **Undo** or **Redo** if a block change is not what you intended.

### 4. Confirm before allocating

1. Review the mission, graph order, parallel rows, budgets, and checks.
2. Select **Review & confirm** or **Confirm structure**.
3. Enter the confirming human's name.
4. Select the confirmation checkbox.
5. Issue the confirmation receipt.

The receipt is bound to the current Graph SHA-256. Any later mission or Graph
change clears the receipt and locks team allocation again.

This browser receipt is self-asserted local intent evidence. The name is free
text; neither the browser nor the runtime handoff validator authenticates the
person, verifies their role, or checks a digital signature. A production
Harness must require an authenticated, authorized approval before execution or
any external effect. The local receipt alone is not execution authority.

### 5. Prepare the Agent Team handoff

1. Open **Agent Team** after confirmation.
2. Review the capability roles, workstream territories, budgets, stop
   conditions, adapters, and typed IPC contract.
3. Select **Prepare agent handoff**.
4. Save the downloaded JSON pack.

The pack is intentionally marked `PENDING_RUNTIME_VALIDATION`. No agent has
started yet.

## Understand the screen

### Header controls

| Control | Purpose |
|---|---|
| **EN / 中文** | Switch the interface language. The preference is stored locally. |
| **Import** | Load a complete blueprint JSON file after safety checks. |
| **Export** | Download the current editable blueprint as a backup or transfer file. |
| **Confirm structure** | Validate the current structure and open the hash-bound human confirmation dialog. |

### Mission view

Use this view to define the end state before you define the work:

- objective: the result the graph must produce;
- non-goals: work explicitly outside this mission;
- success criteria: observable conditions for terminal acceptance;
- presentation summary: the plain-language explanation shown on the opening
  page.

Write success criteria as checks, not aspirations. “The strict validator exits
with code 0” is testable. “The graph is excellent” is not.

The architecture diagram in this view is a presentation of the contract. Its
positions, colors, animations, and feedback arrow do not create Graph edges or
execution. You can pause the animation, show the supplied reference overlay,
or enter full screen without changing mission semantics.

### Graph view: Blocks mode

Blocks is the default beginner workspace. It shows topological levels:

- blocks on the same row may be independently ready;
- a later row waits for its declared dependencies;
- a merge block waits according to its explicit join contract.

The available blocks are finite and safe by design:

| Block | Use it when | Default bound |
|---|---|---|
| **Clarify one unknown** | A decision depends on an unresolved assumption. | 3 minutes, 1 attempt, 3 tool calls |
| **Ask for approval** | A named human must approve or reject before continuation. | 5 minutes, 1 attempt, 1 tool call |
| **Improve with a limit** | One artifact needs a bounded try-check-improve cycle. | 4 minutes, 2 attempts, 4 tool calls |
| **Check the result** | Delivery needs another objective evidence gate. | 3 minutes, 1 attempt, 3 tool calls |

The available recipes apply two compatible blocks as one undoable
transaction:

| Recipe | Adds |
|---|---|
| **Clarify, then check** | An unknown-resolution step and a final evidence check |
| **Add an approval path** | A typed human approval gate and a final evidence check |
| **Improve safely** | A bounded Loop node and a final evidence check |

Every block operation follows the same transaction:

1. Construct a complete candidate Graph.
2. Add the required typed connector and finite budget floor.
3. Validate the complete candidate.
4. Commit everything or commit nothing.
5. Clear stale confirmation and runtime authority.
6. Store a client-validation edit receipt.

An invalid operation does not partially change the saved graph or its history.
Approval blocks emit an explicit `approval_receipt`; bounded improvement stays
inside one Loop node and never creates a Graph cycle.

Use **Configure** for the protected plain-language fields. Use **Remove** only
when the block remains a simple Lego connection. A block involved in an
Advanced-mode merge or failure route must be edited in Advanced mode so the
interface cannot silently change its semantics.

### Graph view: Advanced mode

Advanced mode edits the same canonical object as Blocks mode. Use it when you
need direct control over:

- node IDs, kinds, owners, inputs, outputs, reads, and writes;
- verifiers, timeouts, attempts, tool caps, effect classes, and recovery;
- typed data, control, verification, failure, or compensation edges;
- join targets, exact input sets, modes, and join verifiers;
- Graph-level budgets, permission boundaries, stop conditions, and durable
  state paths;
- existing Agent Team workstreams and their Graph mappings.

Advanced mode is appropriate only when you can preserve these invariants:

- the graph stays finite, static, directed, and acyclic;
- every target has one writer;
- every multi-input node has an explicit join;
- every schema-bearing edge matches both endpoints;
- every node has one durable owner, finite budgets, a verifier, and recovery;
- external effects have approval, exact allowed targets, idempotency, and
  compensation;
- Claude, Antigravity, and Codex adapter IDs never become durable owners.

If direct editing creates an invalid contract, the interface keeps the work in
repair mode and shows the issues. It does not certify or hand off the draft.

### Agent Team view

This view remains locked until the current mission and Graph have a valid human
confirmation receipt.

The default command contains three independently ownable workstreams:

| Workstream | Capability owner | Primary result |
|---|---|---|
| Editable blueprint builder | `interface-builder` | Isolated implementation artifact |
| Graph contract reviewer | `contract-reviewer` | Strict contract and boundary review receipt |
| Experience and accessibility reviewer | `experience-reviewer` | Browser acceptance receipt |

Each workstream maps one-to-one to a reachable `agent` or `agent-team` Graph
node. It has an exclusive territory or receipt path, typed inputs, one output,
finite budgets, a verifier, and a stop condition. Shared integration remains
serial and belongs to `integration-owner`.

The interface does not offer a loose “add worker” button. A new workstream is
valid only when its Graph node, capability route, integration reference,
budget, verifier, recovery path, and artifact are created together.

### Runtime adapter roster

The legacy seed declares three replaceable adapters:

| Adapter | Declared mission capabilities |
|---|---|
| Claude | Mission planning, static DAG and typed-contract review, architecture-boundary review, independent review, evidence synthesis |
| Antigravity | Workflow orchestration, runtime monitoring, browser acceptance, accessibility, and responsive visual review |
| Codex | Repository editing, static-web implementation, state modeling, test execution, and integration-candidate production |

These are declarations, not endpoint-health claims. Their browser status stays
`UNVERIFIED`. Workstream owners remain capability roles such as
`contract-reviewer`; they are never changed to `claude`, `antigravity`, or
`codex`.

The Phase 1 catalog at `blueprint/adapter-registry.json` adds three optional
candidates to the future dynamic runtime:

| Adapter | Unverified capability hints |
|---|---|
| Grok | Research synthesis, multimodal analysis, independent review |
| Kimi | Long-context analysis, document analysis, multimodal analysis |
| DeepSeek | Code analysis, reasoning review, document analysis |

These hints are not provider guarantees. The Harness must measure the current
capabilities and issue a fresh probe receipt before routing any workstream.

At runtime, the Harness must:

1. resolve each opaque `connection_ref`;
2. probe the required adapters;
3. match required capabilities, workspace modes, and permission profiles;
4. select routes for the current run;
5. bind the readiness receipt to both the Graph and command hashes.

Do not place tokens, passwords, API keys, endpoint URLs, or launch commands in
the blueprint.

### Dynamic task and media contracts

Task-specific work begins with a `TaskSpec`, classification receipt, and a
versioned template from `blueprint/task-template-registry.json`. Templates
enumerate a bounded input set before compilation and always produce one finite
static Graph. If the task changes after compilation, the run is superseded and
must be compiled, validated, and confirmed again.

Media inputs use `blueprint/media-asset-manifest.example.json` as the Phase 1
shape. Store exact bytes in a future content-addressed service and pass only
`cas://` or `artifact:` references through the Graph and Agent IPC. Do not
paste base64 media, credentials, or provider transcripts into JSON.

### Presentation view

Presentation settings change appearance without changing Graph semantics:

- Midnight or Paper theme;
- Cyan, Orange, or Violet accent;
- horizontal or vertical Graph direction;
- comfortable or compact density;
- minimap, guardrail, and evidence-label visibility.

These changes do not invalidate a current structure confirmation.

The **Complete blueprint JSON** field exposes every persisted field. Select
**Refresh from draft** before editing if the text may be stale, then select
**Validate & apply JSON**. The editor accepts data only; imported HTML, CSS,
and JavaScript are never executed.

**Reset draft** restores the canonical seed. Export first if you may need the
current draft.

## The complete operating lifecycle

The intended lifecycle is:

```text
DRAFT
  -> VALIDATED
  -> STRUCTURE_CONFIRMED(graph hash)
  -> ALLOCATION_DRAFT
  -> HANDOFF_PENDING_RUNTIME_VALIDATION
  -> RUNTIME_CONTRACT_VALIDATED
  -> ADAPTER_READINESS
  -> WORKERS_READY
  -> SERIAL_INTEGRATION
  -> CLEANUP_VERIFIED
  -> TERMINAL_VERIFICATION
```

The browser owns the lifecycle only through handoff preparation.

### Phase 1: Draft

Define the mission and assemble the static Graph. A draft may be saved locally
even while it needs repair, but invalid nodes are never ready to run.

### Phase 2: Client validation

The browser checks Graph and cross-contract invariants immediately. This is
editing feedback, not a process exit code or runtime receipt.

### Phase 3: Human structure confirmation

A human confirms the exact semantic Graph hash. Presentation settings and team
allocation drafts are excluded from that hash. The separate Agent Team command
hash covers its workstreams, adapter declarations, routing requests, and IPC
contract.

The browser records the name as free text. This local receipt proves only that
someone using the page asserted confirmation of the displayed hash. It does
not prove identity, organizational authority, or a cryptographic signature.
The production Harness must bind an authenticated approval from an authorized
principal to the same hash before it treats the gate as execution authority.

### Phase 4: Handoff export

The browser exports:

- the exact embedded Graph contract;
- the exact Agent Team command;
- their separate expected hashes;
- the human confirmation receipt;
- empty runtime-validation and adapter-readiness receipts;
- no credentials and no selected adapter route.

### Phase 5: Deterministic runtime contract validation

Run the validator against the exported pack, not merely against the seed:

```powershell
python tools/validate_mission_handoff.py .\mission-handoff.json `
  --receipt .\runtime-validation-receipt.json
```

Success returns exit code `0` and a receipt with status
`RUNTIME_CONTRACT_VALIDATED`. Failure returns exit code `1` and records the
contract error. The validator:

- checks the handoff envelope and human receipt;
- recomputes the Graph and command SHA-256 values;
- rejects fixed vendor bindings and secret-like fields;
- validates adapter, route, workspace, permission, and IPC declarations;
- runs the strict Graph validator on the embedded Graph.

Even a successful receipt contains `launch_authorized: false`. It proves
contract integrity, not adapter readiness.

### Phase 6: Harness readiness

The external Harness now proves:

- adapter endpoint health;
- capability-compatible route selection;
- isolated workspaces or worktrees;
- enforced permission profiles;
- initialized append-only, hash-chained IPC;
- leases, timeouts, duplicate-delivery behavior, and cleanup;
- a readiness receipt bound to both contract hashes.

Before issuing that receipt, run an end-to-end trace plus failure-path tests
for worker loss, lease expiry, duplicate events, checkpoint replay, permission
denial without mutation, partial writes, compensation, verified rollback, and
cleanup. A capability declaration or successful endpoint probe alone is not
runtime readiness.

Only after this receipt may Agent Team work become ready.

### Phase 7: Execution and integration

The Harness schedules only `READY` nodes whose dependencies have verified
receipts. Each worker writes only its isolated territory. The integration owner
reviews and applies accepted artifacts serially after the explicit join.

Persist a node transition and edge payload locator before releasing a
successor. Pass content-addressed artifacts and typed receipts, not complete
vendor chat transcripts.

### Phase 8: Cleanup

On success, failure, interruption, or budget stop, the Harness and Team
commander must release worker processes, worktrees, leases, temporary
permissions, and scoped runtime resources. Record the result in the declared
cleanup receipt.

Cleanup failure keeps the mission incomplete. Preserve the checkpoint and
escalate until the system reaches a verified safe state.

### Phase 9: Verify before claim

The terminal verifier checks the end-to-end objective, required node and join
receipts, budgets, permissions, compensation state, checkpoint identity, and
the actual cleanup receipt. Green worker statuses alone do not prove mission
completion.

## Saving, importing, and recovery

### Local drafts

The editor stores a versioned local draft in the browser. This storage is a
convenience, not durable runtime Graph state.

Export JSON before:

- clearing browser data;
- switching browsers or computers;
- making large Advanced-mode edits;
- resetting the draft;
- preparing a handoff you may need to reproduce.

### Import safety

Imports are limited to:

- 1 MiB total size;
- 24 nesting levels;
- 512 items per array;
- 20,000 characters per string.

Prototype-pollution keys and secret-like runtime fields are rejected.
Confirmation, handoff, probe, route-selection, and readiness authority are
always discarded on import. You must validate and confirm the imported
structure again.

### Invalid or corrupt saved data

- A minimally shaped but invalid draft reopens in repair mode with its issues.
- A corrupt or incomplete envelope falls back to the canonical seed and shows
  a warning.
- A storage quota or permission error leaves the in-memory draft active. Export
  before closing the page.
- If another browser tab saves a competing draft, export the current tab and
  reload before choosing which version to keep.

Undo and redo restore editable content only. They never restore confirmation,
handoff, adapter probes, selected routes, or launch authority.

## Command-line tools

Run commands from the repository root.

### Validate a strict Graph contract

```powershell
python skills/graph-engineering/scripts/validate_graph_contract.py `
  skills/graph-engineering/references/diamond-graph-example.json --strict
```

Validate the canonical mission seed:

```powershell
python skills/graph-engineering/scripts/validate_graph_contract.py `
  blueprint/default-blueprint.json --strict
```

Use the first command as a small reference. Use the second to check the
canonical seed. Use `validate_mission_handoff.py` for a browser-exported
handoff because it also validates the Agent Team command and both hashes.

### Validate a bounded Loop contract

```powershell
python skills/loop-engineering/scripts/validate_loop_contract.py `
  skills/loop-engineering/references/ci-repair-loop-example.md --strict
```

### Run the complete test suite

```powershell
python -m unittest discover -s tools -p "test_*.py" -v
python -m unittest discover -s experiments/graph-engineering/tests -p "test_*.py" -v
python skills/graph-engineering/scripts/validate_graph_contract.py `
  skills/graph-engineering/references/diamond-graph-example.json --strict
python skills/graph-engineering/scripts/validate_graph_contract.py `
  blueprint/default-blueprint.json --strict
python skills/loop-engineering/scripts/validate_loop_contract.py `
  skills/loop-engineering/references/ci-repair-loop-example.md --strict
node --test blueprint/model.test.js
node core/ooda/ooda_loop.test.js
git diff --check
```

The GitHub Actions workflow runs the Python architecture checks on Python 3.8
and 3.13, the strict Graph and Loop validators, the JavaScript model suite,
the OODA example, and whitespace checks.

### Run the bounded admission experiment

```powershell
python experiments/graph-engineering/benchmark.py
```

The experiment compares two fixed fixtures:

- a bounded diamond where independent branches justify Graph execution;
- a dependency-linked task where a serial Loop remains the better choice.

It writes a local receipt under
`experiments/graph-engineering/receipts/`. Treat it as evidence for those
fixtures only, not a universal performance benchmark.

## Repository map

| Path | Purpose |
|---|---|
| `index.html` | Standalone opening blueprint and embedded canonical fallback |
| `blueprint/default-blueprint.json` | Canonical strict Graph, presentation, and Agent Team seed |
| `blueprint/model.js` | Pure validation, hashing, block transactions, import, confirmation, and handoff logic |
| `blueprint/app.js` | Browser editing, rendering, persistence, dialogs, and downloads |
| `blueprint/styles.css` | Responsive application styling |
| `blueprint/reference-diagram.css` | Source-aligned 1536×1024 diagram styling |
| `blueprint/reference-assets/` | Provenance-tracked visual assets |
| `skills/graph-engineering/` | Static DAG contract, strict validator, and reference graph |
| `skills/loop-engineering/` | Bounded temporal repetition contract and validator |
| `skills/agent-teams-command/` | Team ownership, IPC, isolation, integration, and cleanup contract |
| `skills/harness-engineering/` | Runtime scheduling, permission, adapter, observability, and recovery contract |
| `skills/context-manager/` | Context budgeting, checkpointing, and payload-transfer contract |
| `skills/verify-before-claim/` | Evidence and completion-claim contract |
| `skills/agentic-engineering/` | Workflow admission and architecture-selection contract |
| `core/ooda/` | Bounded node-local adaptation example |
| `tools/` | Bundle, Graph, Loop, blueprint, and handoff tests |
| `experiments/graph-engineering/` | Deterministic admission and recovery experiment |
| `architecture-manifest.json` | Machine-readable architecture and supporting-asset inventory |
| `docs/` | Boundaries, adoption, provenance, and operator documentation |
| `.github/workflows/quality.yml` | Continuous integration checks |

## Architecture ownership model

Keep these responsibilities separate:

| Question | Owner |
|---|---|
| Which output unlocks which node? | Graph Engineering |
| What repeats with a finite stop? | Loop Engineering |
| Who owns an independent process and artifact? | Agent Teams Command |
| Who schedules, probes adapters, and enforces permissions? | Harness Engineering |
| How does state survive a context window? | Context Manager |
| What evidence supports the final claim? | Verify Before Claim |
| Should this task use a graph at all? | Agentic Engineering |

OODA is a node-local adaptation example. It does not create Graph topology.

## How to extend the project safely

### Change the default mission

1. Edit `blueprint/default-blueprint.json`.
2. Keep the root `index.html` embedded seed exactly synchronized.
3. Validate the seed with `--strict`.
4. Run the Python blueprint tests and JavaScript model tests.
5. Update `architecture-manifest.json` if the architecture, relationship, or
   supporting asset changed.
6. Update `CHANGELOG.md`.

The synchronization test will fail if the canonical JSON and embedded seed
diverge.

### Add a beginner block

A block is more than a card. Define:

- one finite catalog entry;
- a deterministic insertion point;
- typed input and output behavior;
- one owner and write territory;
- finite node and Graph budget effects;
- an objective verifier;
- a failure status and recovery path;
- authority reset after semantic change;
- a durable client-validation receipt;
- insertion, update, removal, round-trip, and strict-validator tests.

Do not introduce an independent block graph. Blocks must compile into the one
canonical Graph contract.

### Add a starter recipe

A recipe must use the same atomic block transaction path as a single block.
Keep it finite, make it one undoable operation, and test both client and strict
Graph validation.

### Add a workstream

Create the following as one coherent change:

1. an `agent` or `agent-team` Graph node;
2. its typed inputs and one output artifact;
3. one capability-based owner;
4. exclusive territory;
5. finite budget and stop condition;
6. one matching Agent Team workstream;
7. one capability-only route request;
8. its explicit integration dependency;
9. verifier, recovery, and cleanup evidence.

Never bind the durable owner to a provider ID. Never let two workstreams write
the same target.

### Add an external effect

External, shared, destructive, published, credentialed, or financial effects
must have:

- exact allowed targets and explicit denials;
- a typed approval receipt from a human gate;
- idempotency and duplicate-delivery rules;
- compensation and a verified rollback route;
- independent terminal review.

The beginner palette intentionally does not create these effects.

### Add runtime execution

Treat a production Harness as a separate implementation. It must consume the
exported contracts without changing their dependency meaning. At minimum,
implement:

- durable graph and event state;
- a deterministic ready queue and leases;
- adapter discovery, probes, and capability routing;
- narrow tool permissions and credential references;
- isolated workspaces;
- typed, hash-chained IPC;
- node, join, integration, readiness, cleanup, and terminal receipts;
- node-local retry and checkpoint recovery;
- duplicate-delivery and permission-denial tests.

## Troubleshooting

### The page opens without styling or behavior

Run the local server from the repository root, not from `blueprint/`, and open
`http://localhost:8080/`. Check that `index.html`, `blueprint/app.js`,
`blueprint/model.js`, and the CSS files keep their repository-relative paths.

### Team allocation is locked

The current Graph is either invalid or lacks a current confirmation receipt.
Open **Graph**, resolve all issues, select **Confirm structure**, and issue a
new receipt.

### Confirmation disappeared

A mission or Graph semantic edit, import, undo, redo, or block transaction
correctly invalidated it. Presentation-only changes should not. Review the new
hash and confirm again.

### A block cannot be removed

It participates in an explicit join, an Advanced-mode failure route, or a
connector whose semantics cannot be reconstructed safely. Switch to Advanced
mode and edit the full contract deliberately.

### Import is rejected

Check the size and depth limits, confirm the root is valid JSON, remove
prototype keys, and remove any credentials or fixed runtime-provider fields.
An imported file cannot carry trusted confirmation or runtime authority.

### The handoff validator fails

Read the receipt's `errors`, `validator_stdout`, and `validator_stderr`. Common
causes are:

- an edited Graph or command no longer matches its declared hash;
- the confirmation receipt refers to another Graph hash;
- an adapter ID was used as a durable owner;
- a route request no longer matches its workstream;
- an adapter no longer covers a required capability, workspace mode, or
  permission profile;
- selected routes, probe receipts, credentials, or launch authority were
  inserted into a browser handoff;
- the embedded Graph fails strict validation.

Fix the editable source, issue a fresh confirmation, export a new handoff, and
validate that new pack. Do not patch the exported receipt to force success.

### Tests fail after a documentation or manifest change

Confirm every manifest path exists, supporting-asset IDs are unique, release
versions remain aligned, and no copied upstream file was changed without its
provenance update.

## Non-negotiable safety rules

- No dynamic Graph expansion.
- No Graph cycles; put bounded repetition inside a Loop node.
- No hidden joins.
- No overlapping writers.
- No unbounded retries.
- No whole-graph replay merely for convenience.
- No adapter ID as a durable owner.
- No credentials in blueprint or handoff JSON.
- No external effect without approval, scope, idempotency, compensation, and
  evidence.
- No completion claim without fresh terminal verification.

## Related reading

- `docs/maximum-potential-guide.md` — the operating playbook for getting the
  most verified throughput from the project.
- `docs/mission-blueprint.md` — detailed browser, confirmation, and handoff
  contract.
- `docs/architecture-boundaries.md` — MECE ownership and composition rules.
- `docs/adoption-guide.md` — staged adoption from local editing to production
  controls.
- `skills/graph-engineering/references/graph-contract.md` — full strict Graph
  schema.
