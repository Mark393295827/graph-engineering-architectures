# Mission Blueprint and Agent Handoff

## Purpose

The editable web blueprint makes the entire mission legible at repository
open. It is a projection and editor for the architecture contracts, not a
scheduler or a new architecture.

The forward-only lifecycle is:

```text
DRAFT -> VALIDATED -> STRUCTURE_CONFIRMED(hash)
      -> ALLOCATION_DRAFT -> HANDOFF_PENDING_RUNTIME_VALIDATION
```

`blueprint/default-blueprint.json` is the canonical seed. It passes the same
strict Graph validator as other graph contracts. The root `index.html` embeds
an exact copy so the first view works without a build step or network request.

## Editable domains

The guided interface edits:

- mission title, summary, objective, non-goals, and success criteria;
- node identity, kind, owner, payloads, reads, writes, verifier, budgets,
  effects, idempotency, compensation, label, and summary;
- typed edges and their endpoints, schemas, conditions, and types;
- joins, input sets, targets, modes, and verifiers;
- team commander, integration owner, topology, admission value, orchestration
  tax, checkpointing, interrupt policy, IPC, workstreams, isolated territory,
  artifacts, dependencies, verifiers, budgets, and stop conditions;
- theme, accent, density, direction, visibility preferences, and raw JSON.

Text-list controls support add, remove, and reorder through one-item-per-line
editing. Raw JSON exposes the remaining versioned fields. User content is
assigned through form values or `textContent`; imported HTML, CSS, and
JavaScript are never executed.

## Confirmation boundary

The browser validates the static invariants and computes SHA-256 over mission
and Graph semantics. Presentation and team-allocation drafts are excluded from
that structure hash.

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
Its validation is immediate drafting guidance. The exported handoff remains
`PENDING_RUNTIME_VALIDATION` until an execution harness runs:

```powershell
python skills/graph-engineering/scripts/validate_graph_contract.py `
  blueprint/default-blueprint.json --strict
```

## Agent Team boundary

Only the post-confirmation `agent` and `agent-team` work is represented as
independently ownable workstreams. Deterministic and human-gate nodes are not
turned into teammates.

The default command program admits three streams:

1. one isolated interface builder;
2. one independent Graph and architecture-contract reviewer;
3. one independent experience and accessibility reviewer.

They use capability descriptions, exclusive territories or receipt artifacts,
finite budgets, typed IPC, objective verifiers, explicit stop conditions, and
one serial integration owner. The exported handoff pack prepares this command
program and carries the expected structure hash plus a required, empty runtime
validation receipt. It never launches a process, invokes a model, schedules
work, changes permissions, claims the strict validator ran, or certifies
completion.

## Persistence and recovery

Local drafts use a versioned storage envelope. Storage denial, quota failure,
corruption, and cross-tab changes produce visible warnings without replacing
the in-memory draft. Export JSON before clearing browser data or switching
machines.

Import limits are 1 MiB, 24 nesting levels, 512 items per array, and 20,000
characters per string. Forbidden prototype keys are rejected before the
current draft changes.

The canonical JSON, repository checkpoints, event ledgers, workstream
artifacts, integration receipt, and cleanup receipt remain the durable
execution artifacts. Browser local storage is a drafting convenience, not
runtime graph state.
