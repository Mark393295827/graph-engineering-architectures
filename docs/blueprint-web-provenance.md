# Blueprint Web Provenance

## Design input

The user supplied a local package named `graph-engineering-web` on 2026-07-28.
It contained a bilingual, neon-styled static diagram implemented with HTML,
CSS, JavaScript, and raster image crops.

The package did not identify a repository commit or license for its reference
image, avatar, vendor logos, or cropped icons. None of those files, and none of
its standalone generated HTML, were copied into this repository.

## Adaptation

The repository-specific blueprint is a clean implementation. It carries
forward only non-exclusive interaction ideas:

- a dark luminous control-room visual direction;
- English and Simplified Chinese controls;
- a visible workflow overview;
- responsive presentation and reduced-motion support.

Fixed vendor roles, animated retry claims, feedback arrows that resemble graph
cycles, pre-checked task claims, the fixed 1536-by-1024 canvas, and source-image
overlay behavior were intentionally excluded. The merged implementation uses
capability-based roles, a bounded static DAG, explicit joins and budgets, a
hash-bound human gate, safe editing, and an export-only Agent Team handoff.

## Repository ownership

The following files are repository-specific and are not part of
`provenance/upstream-files.sha256`:

- `index.html`
- `blueprint/`
- `docs/mission-blueprint.md`
- `docs/blueprint-web-provenance.md`
- `tools/test_mission_blueprint.py`

Third Brain files continue to be governed by the pinned upstream provenance
record. Future imported visual assets require an exact source, license, and
file-level checksum before they may be added.
