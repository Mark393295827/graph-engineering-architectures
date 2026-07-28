# Maximum-Potential Operating Guide

The project reaches its full potential when it increases **verified
throughput**: more accepted work in less elapsed time, with less rework and no
loss of control. The goal is not to create the largest graph, recruit the most
agents, or keep every adapter busy.

Use this guide after you understand the basic controls in
`docs/project-usage-manual.md`.

## The operating model in one sentence

Declare the mission first, use the smallest architecture that fits, parallelize
only independent work, route by capability after readiness, integrate through
one owner, and require fresh evidence before every consequential claim.

## 1. Start with architecture admission

Every mission begins as a one-shot task. Add machinery only when a measured
constraint justifies it.

| Situation | Best starting primitive |
|---|---|
| One small, direct task | One-shot execution |
| The same action repeats until a finite condition | Bounded Loop |
| Outputs have explicit dependencies, independent branches, a typed join, or valuable failure locality | Static Graph |
| The Graph needs scheduling, tools, permissions, adapter probes, or durable recovery | Harness |
| Independent branches need separate process owners or independent review | Agent Team inside selected Graph nodes |

Use the following admission calculation:

```text
expected graph value
  = sequential time
  - static critical-path time
  - scheduling, IPC, review, integration, and cleanup cost
```

Admit the Graph or Agent Team only when the expected value is positive **and**
review capacity can absorb the parallel output. Independent evaluation and
failure localization may also justify the architecture even when the time
saving is modest, but name that benefit explicitly.

The included experiment demonstrates the decision boundary on only two
deterministic fixtures. Its diamond fixture measured a 1.957× Graph-versus-Loop
ratio, while its sequential fixture correctly skipped Graph execution. This is
local architecture evidence, not a production performance claim or target.

## 2. Compile the mission before assigning work

The fastest way to waste multi-agent capacity is to distribute an ambiguous
objective. Before touching the Agent Team view, make the blueprint answer:

1. What exact outcome will exist?
2. What is explicitly out of scope?
3. Which checks prove the outcome?
4. Which steps consume which prior outputs?
5. Which steps are truly independent?
6. Who owns every result and write target?
7. What is the finite time, attempt, tool, and review budget?
8. What happens when a check fails?
9. Which actions require human authority?
10. Where will state, artifacts, and receipts survive the run?

For a beginner, the fastest reliable method is:

1. Edit the mission fields.
2. Apply the smallest useful starter recipe.
3. Configure each block's plain-language verifier.
4. Check the connected levels.
5. Open Advanced mode only for semantics the safe catalog cannot express.
6. Export a checkpoint before large edits.

Do not add a step just because it sounds organized. An edge exists only when
one output is a real input, control decision, verification result, failure
route, or compensation trigger for another node.

## 3. Design the Graph around the critical path

### Use width where it pays

The default mission uses a bounded fork-and-join:

```text
runtime validation
  -> adapter readiness
     -> implementation
     -> contract review
     -> experience review after implementation evidence
  -> serial integration
  -> terminal verification
```

The implementation and contract review can begin from the same verified
readiness boundary. Experience review consumes the implementation candidate.
Serial integration waits for the exact declared input set.

To improve throughput:

- move independent evidence work off the critical path;
- keep deterministic validation outside agent context when possible;
- start only nodes whose dependencies are verified;
- make every branch produce a small typed artifact;
- keep joins explicit and cheap to evaluate;
- limit the number of open branches to actual integration and review capacity.

### Keep repetition out of topology

If one result needs two improvement attempts, use one bounded Loop node. Do not
draw a feedback edge and do not grow the Graph at runtime. The node must expose
one final typed output whether it succeeds, fails verification, or exhausts
its budget.

### Keep writes exclusive

Give every shared target one writer. Workers should produce isolated candidate
artifacts or review receipts. Only the integration owner writes accepted
changes to shared canonical files.

This rule prevents merge races, inconsistent schemas, and “last writer wins”
success claims.

## 4. Allocate Claude, Antigravity, and Codex by capability

The adapters collaborate through a Harness, typed IPC, and content-addressed
artifacts. They are not assumed to share native memory or talk directly to one
another.

The current roster makes these adapters natural candidates:

| Required capability | Natural candidate from the current declaration |
|---|---|
| Mission planning, DAG review, typed-contract review, evidence synthesis | Claude |
| Runtime orchestration, monitoring, browser, accessibility, responsive review | Antigravity |
| Repository editing, state modeling, test execution, integration candidate | Codex |

This is a candidate map, not a fixed assignment. At the start of every run the
Harness must probe availability and select a ready adapter that satisfies:

- all required capabilities;
- the requested workspace mode;
- the requested permission profile;
- compatible `agent-team-ipc/1.0`;
- the current concurrency cap.

Durable owners stay vendor-neutral:

```text
good: owner = "contract-reviewer"
bad:  owner = "claude"
```

This separation lets a compatible adapter be replaced without changing Graph
topology or workstream ownership.

### Use the default trio deliberately

A high-value default operating pattern is:

1. A planning or contract-review capability independently challenges the
   mission and dependency model.
2. An implementation capability works in an isolated worktree or artifact
   territory.
3. A browser and experience capability evaluates the candidate without owning
   its source.
4. The integration owner accepts or rejects artifacts serially.
5. The terminal verifier checks the integrated result independently.

The checker should not inherit the maker's private reasoning transcript. Give
the checker the declared inputs, artifact locator, expected contract, and
evidence requirements.

### Handle an unavailable adapter

If an adapter probe fails:

1. Mark only the affected route blocked.
2. Emit a typed readiness or dependency receipt.
3. Preserve already verified branches.
4. Pause and escalate to the operator. The current command sets
   `automatic_substitution: false` and `unavailable_action:
   PAUSE_AND_ESCALATE`.
5. Replace or remove a required adapter only through an explicit operator
   decision and a valid contract change. Recompute both hashes, repeat runtime
   validation, and run the readiness gate again before releasing work.

Never silently route by provider name, lower the permission boundary, or claim
readiness from a browser declaration.

## 5. Treat every gate as an evidence contract

| Gate | Owner | Required evidence | Failure recovery |
|---|---|---|---|
| Client validation | Browser model | Current candidate passes bounded browser checks | Repair the draft; no partial block mutation |
| Structure confirmation | Human mission owner | `HUMAN_CONFIRMED` receipt bound to Graph hash | Review and confirm the new structure |
| Runtime contract validation | Deterministic validator | `RUNTIME_CONTRACT_VALIDATED` receipt for Graph and command hashes | Fix source, reconfirm, re-export |
| Adapter readiness | Harness | Probe, route, isolation, permission, IPC, and two-hash readiness receipt | Pause and escalate; reroute only after an explicit contract-authorized decision |
| Node verification | Node verifier | Typed output and objective node receipt | Retry only that node after changed diagnosis |
| Join verification | Integration or join verifier | Exact declared inputs and join decision | Reject the smallest invalid branch or join |
| Terminal verification | Verification owner | End-to-end acceptance and guardrail receipt | Withhold completion and recover the failed scope |
| Cleanup | Harness / Team commander | Workspace, lease, process, and permission cleanup receipt | Keep run incomplete until safe state is restored |

Human confirmation does not authorize worker launch. Runtime validation does
not prove endpoint health. Adapter readiness does not prove the mission
completed. Keep the claims narrow at every gate.

The browser's `confirmed_by` value is free text. Its receipt is self-asserted
local intent evidence, not authenticated identity or a digital signature. A
production Harness must verify that an authorized principal approved the same
Graph hash before execution or any external effect.

## 6. Use the two hashes as the mission identity

The handoff deliberately binds two separate contracts:

- Graph hash: mission intent, topology, payloads, joins, budgets, effects, and
  recovery.
- Command hash: team ownership, workstreams, adapter declarations, capability
  requests, IPC, and integration policy.

Every readiness event and runtime message should carry both hashes. This
prevents a worker from acting on a valid Graph with a stale team command, or a
valid command with a changed mission.

When either hash changes:

1. stop releasing new work;
2. preserve verified artifacts;
3. mark stale receipts unusable;
4. validate the new contracts;
5. obtain new human confirmation when Graph semantics changed;
6. probe and route again when command or adapter requirements changed.

## 7. Keep communication typed and small

The shared IPC envelope carries:

- run, task, workstream, and Graph node identity;
- sender and recipient capability owners plus selected adapter IDs;
- sequence and timestamp;
- state, artifact, evidence, decision, unknowns, dependency, and next action;
- both contract hashes;
- previous-message and current-message hashes.

Use it as an event ledger, not as a transcript archive.

For each handoff, send:

1. the contract version and hash;
2. one bounded task;
3. input artifact locators;
4. expected output schema and path;
5. verifier and budget;
6. known blockers;
7. the next allowed action.

Store large outputs separately and reference them by content hash. This keeps
context small, makes duplicate events detectable, and lets a replacement
worker resume without reading every earlier conversation.

## 8. Optimize concurrency against review capacity

The current seed sets safety caps:

- maximum Graph concurrency: 3;
- maximum attempts per node: 2;
- maximum concurrency per declared adapter: 1;
- three bounded workstreams;
- one serial integration owner;
- maximum 800 changed lines per review batch.

These are ceilings, not utilization goals.

Increase concurrency only when measurements show:

- ready work is regularly queued;
- branches are genuinely independent;
- adapter probes are reliable;
- reviewers can evaluate the output without a growing backlog;
- integration wait and conflict rates stay bounded;
- cleanup and recovery remain reliable.

Decrease concurrency when:

- integration wait grows;
- review becomes the critical path;
- workstreams touch the same schemas;
- retries share the same failure signature;
- receipts are missing or stale;
- orchestration time approaches the time saved by parallel execution.

The useful concurrency for a run is:

```text
minimum(
  independent READY nodes,
  ready adapter capacity,
  isolated workspace capacity,
  reviewer capacity,
  integration capacity,
  declared Graph cap
)
```

## 9. Recover locally, never restart blindly

When a branch fails:

1. Persist the failure signature and last verified checkpoint.
2. Keep unaffected verified nodes and edge payloads.
3. Diagnose the smallest failing node or join.
4. Change the input, diagnosis, owner, tool, or strategy.
5. Retry only that unit within its finite budget.
6. Re-run the dependent join and terminal checks.

Stop when the same signature repeats after a changed attempt. Return
`NO_PROGRESS`, not an optimistic success.

Use these operating responses:

| Status | Operator response |
|---|---|
| `NEEDS_INPUT` | Resolve the missing objective, owner, schema, verifier, join, authority, or recovery field before launch. |
| `BLOCKED_DEPENDENCY` | Keep affected nodes waiting; continue only independent ready nodes. |
| `BLOCKED_PERMISSION` | Deny mutation, preserve state, and request scoped approval. |
| `VERIFY_FAILED` | Reject the artifact and retry the smallest invalid unit. |
| `NO_PROGRESS` | Stop after the repeated signature; change the mission or escalate. |
| `BUDGET_STOP` | Stop scheduling, checkpoint, compensate active effects, and emit a partial receipt. |

Whole-Graph replay destroys verified work, hides failure locality, and inflates
cost. It is never the default recovery method.

## 10. Run a repeatable mission cadence

### Before execution

- Export a blueprint checkpoint.
- Record the Graph and command hashes.
- Run strict contract validation.
- Confirm the exact Graph structure.
- Validate the handoff pack.
- Probe adapters and resolve capability routes.
- Verify isolation, permissions, IPC, and cleanup capability.
- Set the review capacity and concurrency cap.

### During execution

- Schedule only verified-ready nodes.
- Persist state before releasing successors.
- Watch queue time, adapter health, attempts, tool calls, and elapsed budget.
- Keep artifacts in exclusive territories.
- Review independent evidence without maker transcript leakage.
- Interrupt only the affected workstream when possible.

### At integration

- Freeze the declared input set.
- Confirm every expected artifact and receipt hash.
- Apply one artifact at a time through the integration owner.
- Run the relevant checks after each accepted batch.
- Roll back to the last verified integration checkpoint on failure.

### At completion

- Run the full terminal acceptance checks after the final change.
- Confirm required approvals and compensations.
- Emit terminal and cleanup receipts.
- Capture actual timing, review load, retries, and failure signatures.
- Feed only reusable patterns and decisions into the next blueprint.

## 11. Measure what improves the next mission

Define the scorecard before execution. Avoid inventing success thresholds after
you see the result.

| Dimension | Metric | Why it matters |
|---|---|---|
| Verified throughput | Accepted terminal receipts per wall-clock hour | Measures completed evidence, not activity |
| Critical path | Time from first ready node to terminal verification | Shows whether width created real speed |
| Queue health | READY wait time by capability | Reveals adapter or review bottlenecks |
| Orchestration cost | Scheduling + IPC + integration + cleanup time divided by total elapsed time | Shows when coordination consumes the gain |
| Readiness | Ready capability routes divided by requested routes | Measures whether the declared team can actually run |
| First-pass quality | Nodes passing their verifier on first attempt divided by executed nodes | Finds unclear contracts and weak ownership |
| Integration quality | Accepted artifacts divided by submitted artifacts | Finds workstream or interface mismatch |
| Failure locality | Verified nodes preserved after a failure divided by verified nodes before it | Proves node-local recovery |
| Recovery | Recoverable failures restored from checkpoints divided by recoverable failures | Measures durable state quality |
| Contract integrity | Strict validation pass rate and hash-mismatch incidents | Finds stale or divergent contracts |
| Evidence completeness | Present hash-bound receipts divided by required receipts | Prevents unsupported claims |
| Permission safety | Denied actions with zero unauthorized mutation | Verifies the real authority boundary |
| Cleanup | Completed runs with verified cleanup receipts | Prevents orphaned processes, leases, and workspaces |
| Review load | Changed lines and review minutes per accepted artifact | Calibrates batch and concurrency caps |

Use trends across comparable missions. A single run is evidence for that run,
not a universal benchmark.

## 12. Choose proven collaboration playbooks

### Blueprint–Build–Review

Use for normal product work:

1. A planning capability clarifies the mission and Graph.
2. An implementation capability builds in isolation.
3. Contract and experience reviewers evaluate independent dimensions.
4. One owner integrates accepted artifacts.
5. Terminal verification checks the complete outcome.

### Maker–Checker

Use for consequential logic or architecture changes:

1. Maker owns the candidate artifact.
2. Checker owns only a review receipt.
3. Checker receives the contract and artifact, not the maker's private
   rationale.
4. Integration requires both candidate and acceptance receipt.

### Parallel specialists with a barrier

Use when several branches consume the same verified input and write separate
artifacts. Name the exact branch set in an `all` or `barrier-verifier` join.
Do not let a missing branch become an implicit optional input.

### Approval before effect

Use for publication, deployment, credentials, destructive changes, shared
state, or financial actions. The human gate emits a typed approval receipt
directly to the effect node. The effect still needs exact allowed targets,
idempotency, compensation, and independent terminal review.

## 13. Scale through a promotion ladder

Promote only when the current level's evidence shows a real limitation:

1. **One-shot:** prove the objective and verifier.
2. **Bounded Loop:** add finite repetition for one local improvement process.
3. **Static Graph:** add explicit dependency width and node-local recovery.
4. **Production Harness:** add scheduling, durable state, leases, permissions,
   probes, telemetry, and recovery.
5. **Agent Team:** add separate process owners only for independent work and
   review.
6. **Higher bounded concurrency:** increase caps only from measured readiness,
   integration capacity, failure rate, and review load.

This order keeps complexity proportional to demonstrated value.

## 14. Avoid the patterns that erase the benefit

- Recruiting one agent for every Graph node.
- Binding work permanently to Claude, Antigravity, or Codex by name.
- Launching from browser validation or human confirmation alone.
- Passing full chat histories instead of typed artifacts.
- Treating visual arrows or animation as dependency topology.
- Adding Graph cycles for retries.
- Letting two workers edit the same shared file.
- Hiding a join inside an integrator prompt.
- Increasing concurrency while review is already backlogged.
- Retrying the same failure without changing diagnosis.
- Replaying the whole Graph after one branch failure.
- Marking completion because every worker says “done.”
- Storing credentials in the blueprint or handoff.
- Treating local experiment timing as a production service-level objective.

## The practical definition of full potential

The project is operating at its potential when:

- the mission is clear enough to compile before work starts;
- the chosen architecture pays for its overhead;
- every parallel branch is independently ownable and reviewable;
- any compatible ready adapter can satisfy a capability role;
- completed branches survive unrelated failure;
- integration is serial, bounded, and reversible;
- runtime state survives context loss;
- permissions deny unauthorized effects without mutation;
- every material claim has fresh, hash-bound evidence;
- the next mission becomes easier because its actual bottlenecks were measured.
