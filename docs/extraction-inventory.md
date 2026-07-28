# Extraction Inventory

## Source Classification

### Core Graph Assets

- `skills/graph-engineering/`
- `tools/test_validate_graph_contract.py`
- `experiments/graph-engineering/`

These files define, validate, and test the bounded static DAG contract.

### Adjacent Architecture Contracts

- `skills/loop-engineering/`
- `skills/agentic-engineering/`
- `skills/agent-teams-command/`
- `skills/harness-engineering/`
- `skills/context-manager/`
- `skills/verify-before-claim/`
- `core/ooda/`

These files are included because the Graph contract explicitly delegates
temporal repetition, workflow selection, process ownership, runtime execution,
context transfer, terminal proof, or node-local adaptation to them.

### Shared Standards

- `docs/agent-skills-standard.md`
- `docs/skill-template.md`
- `tools/test_validate_loop_contract.py`

These preserve the common skill contract and protect the Graph-vs-Loop
boundary.

## Intentionally Excluded

Knowledge ingestion, Obsidian operations, behavior design, startup evaluation,
property operations, daily planning, content adapters, and global installation
scripts are not required to understand or validate Graph Engineering. They
remain in the upstream Third Brain repository.

Broad V7 release notes and product guides were replaced with focused documents
in this repository so the extracted architecture can stand alone without
implying that all Third Brain skills are present.

## Repository-Specific Presentation

The root `index.html`, the blueprint model/editor, mission documentation, and
tests were created for this repository after the upstream extraction. The
visual layout contract and 38 raster assets under
`blueprint/reference-assets/` were separately supplied by the user and
integrated under explicit direction. They provide the source-aligned editable
mission projection, confirmation gate, runtime-adapter declaration, and Agent
Team handoff editor registered in `architecture-manifest.json`.

The repository-specific layer also includes the
`mission-lego-block-compiler` in `blueprint/model.js`, its finite beginner
catalog and recipes, the connected Blocks workspace in `blueprint/app.js`, and
the Node/Python regressions in `blueprint/model.test.js` and
`tools/test_mission_blueprint.py`. Blocks are transient atomic editing
commands: they compile into `blueprint/default-blueprint.json`'s canonical
Graph shape and never create a second persisted block graph. Bounded history
restores editable content only and always clears confirmation, handoff,
adapter-probe, and selected-route authority.

These files are not copied Third Brain assets and are not listed in
`provenance/upstream-files.sha256`. The separate design-input and rights record
is `docs/blueprint-web-provenance.md`; exact asset hashes are in
`provenance/blueprint-reference-assets.sha256`.

## Integrity

`provenance/upstream-files.sha256` records line-ending-normalized hashes for
every copied upstream file. `tools/test_architecture_bundle.py` checks that the
manifest paths, architecture relationships, skill contracts, and provenance
records remain internally consistent.
