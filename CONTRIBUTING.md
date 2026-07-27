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

Dynamic graphs, cycles, hidden joins, overlapping writers, unbounded retries,
and self-certified completion are outside the current scope.
