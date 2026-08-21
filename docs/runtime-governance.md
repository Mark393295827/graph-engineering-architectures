# Runtime Governance for a Bounded Autonomous Factory

This project treats a dark or "lights-out" software factory as a bounded
operating model, not as permission for an agent to rewrite its own running
Graph. The machine-readable boundary is `runtime-governance/1.0`: one schema
with separate `POLICY` and `RECEIPT` records.

The contract is declarative. It does not claim that a scheduler, model
adapter, billing feed, cache meter, or autonomous deployment engine exists in
this repository. A real Harness must enforce the policy and issue evidence.

## Translating the control-path reference

The supplied media describes this visual path:

```text
INPUT -> PLAN -> DISPATCH -> EXECUTE -> KNOWLEDGE -> OUTPUT -> FEEDBACK
```

The repository maps it without creating a cycle:

| Visual stage | Executable meaning | Owner |
|---|---|---|
| Input | Falsifiable goal, context references, constraints, permissions, and budgets | Mission owner |
| Plan | Compile one finite task-specific static DAG and hash-lock it before execution | Graph Engineering |
| Dispatch | Select only ready adapters for predeclared capability routes | Harness Engineering |
| Execute | Run deterministic, Loop, agent, or Agent Team nodes inside declared limits | Harness plus the node owner |
| Knowledge | Produce redacted evidence or an eval candidate in quarantine | Context Manager and Verify Before Claim |
| Output | Deliver artifacts through single writers plus scoped receipts | Integration and verification owners |
| Feedback | Supersede and recompile a future run, or enter a bounded Loop inside one node | Loop Engineering and the mission owner |

`DYNAMIC` therefore means runtime selection among predeclared compatible
routes. It never means adding nodes, edges, writers, or joins to an active
Graph. A semantic change uses `SUPERSEDE_AND_RECOMPILE`. The bright feedback
arrow in a diagram remains a temporal handoff between runs, not a Graph edge.

## The policy and receipt pair

The public files are:

- `blueprint/contracts/runtime-governance.schema.json` — both tagged record
  variants;
- `blueprint/runtime-governance-policy.example.json` — one immutable policy
  example;
- `blueprint/runtime-governance-receipt.example.json` — one evidence example.

`CompiledRunBundle.policy_ref` resolves to the policy. Its existing
`run_lock.policy_sha256` binds the canonical JSON hash. The runtime receipt
repeats that policy hash and also binds the compiled run, Graph, and Agent Team
command hashes. Editing the policy cannot silently preserve runtime authority.

The example values are fixtures, not recommended production thresholds or
current vendor prices. A live system must select caps from reviewed policy and
current runtime telemetry. Provider names, tokenizers, prices, cache discounts,
and product features do not belong in the durable Graph.

## Hard limits and fail-closed execution

The policy declares positive finite ceilings for:

- input, output, and total tokens;
- provider-neutral compute units through a versioned meter reference; and
- spend in integer currency microunits.

Harness Engineering owns reservation and enforcement. It must reserve budget
before dispatch, block unmetered work, and return `BUDGET_STOP` when a cap is
exhausted. A budget stop is never success. The receipt must name the exhausted
dimension and carry the stop receipt while all recorded actuals remain within
the declared ceiling.

The contract validates evidence shape; it cannot prove that a future Harness
actually denied a call. Runtime conformance still needs dispatch, denial,
duplicate-delivery, checkpoint, and recovery tests.

## Prompt-cache evidence without prompt retention

Context Manager owns the context manifest and stable-prefix hash. The receipt
stores hashes and meter references, never raw prompt or interaction content.
For every run:

```text
uncached input + cache-write input + cache-read input = total input tokens
```

An `EVIDENCED` cache status requires a context-manifest reference, stable-prefix
hash, measured cache-read units, at least one hit, and an external meter
receipt. `NOT_USED` and `UNSUPPORTED` cannot claim cache savings. This records
observed units; converting those units into money remains the job of the
versioned compute/pricing meter named by the policy.

## Cost per accepted outcome

Raw token price and generated-code volume are not productivity measures. The
receipt reports cost per accepted outcome only when each outcome has a fresh
Verify Before Claim acceptance receipt. The integer identity is exact:

```text
total spend = quotient * accepted outcome count + remainder
```

The remainder must be smaller than the outcome count. With zero accepted
outcomes, cost per accepted outcome is undefined and must be `null`; it is
never reported as zero. This prevents rounding, division-by-zero, or activity
counts from becoming marketing claims.

## Interaction-to-eval promotion

Self-improvement means improving future eval coverage under governance. It
does not mean recursive self-modification.

The default action is deny. A promotion to `eval-quarantine` requires:

1. a hashed source reference rather than raw interaction content;
2. explicit opt-in;
3. a privacy scan;
4. redaction evidence;
5. a named human approval receipt;
6. a finite retention period no longer than policy; and
7. a quarantined eval-candidate reference.

The promotion record cannot mutate production, a schema, policy, prompt, or
skill. A later proposal must pass its own tests, independent review, approval,
rollback check, and serial integration. If a repair repeats, Loop Engineering
owns the finite retry inside a declared node; the active Graph still does not
change topology.

## Receipt-first does not mean receipt-only

A receipt narrows the review surface by binding claim, artifact and contract
hashes, verifier evidence, actual usage, approvals, and cleanup. It does not
erase ownership or prove universal correctness. High-risk changes still need
independent review, targeted diff inspection, human approval, and a verified
rollback path.

The canonical mission Graph now makes cleanup a typed dependency. The
Harness-owned `runtime-cleanup` node emits `cleanup_receipt`; terminal
verification has an explicit barrier over the integrated artifact and that
receipt. Missing cleanup evidence therefore blocks the terminal claim.

## Validate

From the repository root:

```powershell
python tools/validate_dynamic_contracts.py --strict
python skills/graph-engineering/scripts/validate_graph_contract.py `
  blueprint/default-blueprint.json --strict
node --test blueprint/model.test.js
```

The governance validator rejects soft enforcement, over-cap actuals,
unmetered usage, policy-hash mismatch, unsupported cache-benefit claims,
inexact cost-per-outcome arithmetic, raw interaction content, missing privacy
gates, excessive retention, and automatic mutation.

## Non-goals

- No runtime kernel, provider call, billing integration, or credential store.
- No current pricing, cache-discount, throughput, or "1000x" claim.
- No dynamic Graph expansion, feedback edge, overlapping writer, or
  whole-Graph replay.
- No raw prompt or interaction retention in receipts.
- No automatic eval-to-production, prompt, policy, schema, or skill promotion.
- No terminal completion claim from model prose, decorative counters, or a
  schedule trigger.
