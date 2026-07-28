# Contributing

Keep changes inside the ownership boundaries in
`docs/architecture-boundaries.md`.

Before opening a pull request:

1. Update tests and `architecture-manifest.json` when behavior or topology
   changes.
2. Run all commands in `AGENTS.md`.
3. Include the strict validator receipt for contract changes.
4. Explain admission value, budgets, failure locality, and permission effects.
5. Preserve upstream attribution for copied changes.
6. Keep `blueprint/default-blueprint.json` and the embedded root HTML seed
   identical when the default mission changes.
7. Prove that semantic edits invalidate confirmation, presentation-only edits
   do not, and Agent Team handoff remains locked without a current receipt.

Dynamic graphs, cycles, hidden joins, overlapping writers, unbounded retries,
and self-certified completion are outside the current scope.

The browser blueprint is a presentation and drafting surface. It must not
schedule agents, cross permission boundaries, or present animation as runtime
evidence.
