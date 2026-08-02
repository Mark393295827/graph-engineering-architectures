# Dynamic Multimedia Blueprint — Phase 1

Phase 1 adds the contract foundation for task-specific multimedia missions. It
does not start agents, call providers, ingest bytes, or run a media worker.
The current `index.html` editor remains the safe static planning surface while
these declarations are reviewed and integrated into later runtime phases.

## The execution boundary

The compiler may select a different template for every task, but it must emit a
finite Graph before execution. A running Graph never creates new Graph nodes.
An input collection is enumerated before compilation and is bounded by the
template slot's `max` value. A semantic change pauses and supersedes the run;
the compiler then produces a new version that needs fresh validation and human
confirmation.

The contract flow is:

```text
TaskSpec -> ClassificationReceipt -> BlueprintTemplate
        -> CompiledRunBundle + RunLock -> confirmation -> Harness readiness
```

The source files are:

| Contract | File |
|---|---|
| Task input and budgets | `blueprint/contracts/task-spec.schema.json` |
| Classification and confidence | `blueprint/contracts/classification-receipt.schema.json` |
| Finite task templates | `blueprint/contracts/blueprint-template.schema.json` |
| Frozen per-run bundle | `blueprint/contracts/compiled-run-bundle.schema.json` |
| Multimedia asset identity and lineage | `blueprint/contracts/media-asset-manifest.schema.json` |
| Probe-gated adapter descriptor | `blueprint/contracts/adapter-descriptor.schema.json` |
| Graph admission receipt | `blueprint/contracts/graph-admission.schema.json` |
| Browser admission preview receipt | `blueprint/contracts/graph-admission-preview.schema.json` |
| Six-adapter declaration registry | `blueprint/adapter-registry.json` |
| Task-template catalog | `blueprint/task-template-registry.json` |
| Media manifest example | `blueprint/media-asset-manifest.example.json` |

## Adapter allocation

The registry declares Claude Code, Codex, Antigravity, Grok, Kimi, and DeepSeek
as optional candidates. The declarations contain capability hints, modality
shapes, workspace modes, permission profiles, and opaque connection references.
They do not contain credentials, model claims, provider bindings, or readiness
receipts.

The Harness must probe an adapter before routing a workstream. A `DECLARED` or
`NOT_CONFIGURED` adapter is not ready. Durable Graph ownership continues to use
capability roles such as `research-owner`, `verification-owner`, and
`integration-owner`; the selected adapter is runtime evidence, not topology.

## Multimedia identity

Blueprints and Agent IPC carry references, never media bytes. The media
manifest separates:

- exact blob identity (`sha256` content hash);
- logical asset and version identity;
- detected format and technical metadata;
- provenance, rights, consent, and parent lineage;
- safety scan receipts and retention state;
- accessibility derivatives such as alt text, transcript, and captions.

The eventual data plane will stream uploads into quarantine, identify formats
from bytes, scan active content, normalize safely, commit immutable content to
CAS, and create derivatives as new assets. Phase 1 only defines the contract.

## Graph admission before fan-out

The Mission view includes an editable admission preview so the project can use
the dependency-shape lessons described in the [linked X post](https://x.com/Argona0x/status/2082807844336771532)
without turning an external benchmark into an execution rule. Before a team is
allocated, record:

- the dependency evidence source (static analysis or the declared Graph, not a
  folder/file list);
- the partition strategy, coupling profile, and structural hub IDs to isolate;
- the critical-path floor, finite fan-out ceiling, worker rate, upstream rate
  limit, and coordination-tax ceiling; and
- an enabled zero-token script preflight.

The local browser result is a preview receipt only. The reproducible command
gate reads the actual Graph contract and emits a durable JSON receipt:

```powershell
python tools/graph_admission_gate.py blueprint/default-blueprint.json --strict
```

It returns `ADMIT` only when strict Graph validation passes, dependency width
has measurable payback, the projected request rate is inside its cap, and the
planner gate is enabled. It returns `SERIAL_ONLY` for coupled or non-paying
width, and fails closed with `NEEDS_INPUT` or `RATE_LIMIT_EXCEEDED` otherwise.
The post's reported trial counts, percentages, and speedups remain unverified
research context; this repository measures only the declared local topology.

## Validation

Run the Phase 1 validator from the repository root:

```powershell
python tools/validate_dynamic_contracts.py --strict
```

The validator checks JSON contract documents, the complete six-adapter catalog,
probe gating, finite template cardinality, provider-neutral capability
requirements, content-addressed media references, and secret-shaped fields.

The validator intentionally does not claim that any external adapter is
configured or reachable. Live readiness requires a later Harness probe receipt
bound to the compiled run's hashes.

## Migration order

1. Keep the existing static editor and v1 embedded seed unchanged as the visual
   parity baseline.
2. Add task intake and template selection as a shadow compiler.
3. Add dependency-graph admission and hub/critical-path evidence before
   allocating a team.
4. Add the multimedia quarantine/CAS plane and safe previews.
5. Show the compiled Graph, budgets, route candidates, and evidence before
   confirmation.
6. Add Harness probes and model adapters one at a time with mock conformance
   tests first.

Runtime state, media bytes, credentials, and large fixtures belong outside Git;
`.agent-state/`, `runtime-state/`, and `media-runtime/` are ignored for this
reason.
