# Upstream Provenance

## Source

- Repository:
  `https://github.com/Mark393295827/third-brain-v7-skills`
- Commit: `9cf925c16510c6efe9bf44968fbfa27340a3337b`
- Extraction date: `2026-07-27`
- License: MIT

The local upstream remote still used the historical
`third-brain-v5-skills.git` URL at extraction time. GitHub resolved that URL to
the renamed `third-brain-v7-skills` repository.

## Preservation Policy

Copied assets keep their upstream relative paths. This preserves validator
imports, documentation references, and test commands. The file-level hashes in
`provenance/upstream-files.sha256` record UTF-8 content after normalizing line
endings to LF. This keeps verification stable across Windows and Linux while
allowing later updates to distinguish unchanged copies from repository-specific
documentation and CI.

One terminal blank line was removed from
`skills/loop-engineering/references/ci-repair-loop-example.md` so the initial
repository passes Git whitespace validation. No executable or semantic content
was changed.

## Updating From Upstream

1. Record the new upstream commit.
2. Compare copied paths against `provenance/upstream-files.sha256`.
3. Review Graph boundary changes before copying adjacent architectures.
4. Update `architecture-manifest.json` and this document.
5. Run every required check in `AGENTS.md`.
6. Commit the update with the upstream commit in the message or body.

Do not silently absorb unrelated Third Brain modules. A new copied path must
either define Graph Engineering, implement one of its explicit adjacent
contracts, or provide objective validation evidence.

## Repository-Specific Assets

The editable web blueprint was added after extraction and is intentionally
excluded from the upstream checksum ledger. Its design-input and asset
exclusion decisions are recorded in
[`blueprint-web-provenance.md`](blueprint-web-provenance.md).
