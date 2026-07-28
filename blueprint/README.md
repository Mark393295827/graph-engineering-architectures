# Editable Mission Blueprint

The repository root `index.html` is the opening mission control surface. It
renders `default-blueprint.json`, a strict Graph Engineering contract extended
with presentation metadata and an Agent Teams Command program.

## Open

For the normal local workflow:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080/`. The canonical seed is embedded in the root
HTML as a direct-open fallback, so double-clicking `index.html` also works in
browsers that permit local storage for `file:` pages.

For a control-by-control walkthrough, command reference, troubleshooting, and
safe extension guide, read
[`../docs/project-usage-manual.md`](../docs/project-usage-manual.md). For
architecture admission, capability routing, concurrency, recovery, and
operating metrics, continue with
[`../docs/maximum-potential-guide.md`](../docs/maximum-potential-guide.md).

## Edit and hand off

1. Open **Blocks** and choose a starter recipe or add a safe block. Configure
   its plain-language completion check and finite limits.
2. Use the connected block workspace and local issue links to resolve every
   bounded client-validation issue. Switch to **Advanced** only when direct
   node, edge, join, or raw JSON editing is needed.
3. Review the whole mission and issue a human confirmation receipt for the
   displayed SHA-256 structure
   hash.
4. Edit the now-unlocked capability-based Agent Team workstreams.
5. Review the editable Claude, Antigravity, and Codex adapter declarations.
   They are runtime capabilities, not durable Graph/workstream owners.
6. Export an Agent Team handoff pack. It remains
   `PENDING_RUNTIME_VALIDATION`; exporting does not recruit or run agents.
7. Have the runtime run `tools/validate_mission_handoff.py` on the pack. It
   validates the exact `graph_contract` and `command`, recomputes their
   separate hashes, and emits contract evidence.
8. Have the Harness probe adapters, resolve capability routes, verify
   workspace/permission/IPC readiness, and issue a separate readiness receipt
   before recruiting workers.

Mission and Graph edits invalidate the confirmation receipt. Theme, accent,
density, direction, and other presentation-only edits do not.

## Files

- `default-blueprint.json` — canonical strict graph and team command seed.
- `model.js` — pure validation, hashing, atomic beginner block compilation,
  authority-sanitized history, import, confirmation, and handoff logic; usable
  from the browser and Node.
- `app.js` — safe Blocks/Advanced editing, rendering, persistence, dialogs,
  history, and downloads.
- `styles.css` — responsive presentation model with midnight and paper themes.
- `reference-diagram.css` and `reference-assets/` — provenance-tracked,
  source-aligned 1536×1024 visual system supplied by the user.
- `model.test.js` — dependency-free Node model tests.

The browser stores a versioned local draft and can import or export complete
JSON. Imports are limited to 1 MiB, bounded in depth and array count, reject
prototype-pollution keys, and never trust imported confirmation or handoff
authority. Do not put credentials or secrets in a blueprint.

Blocks and Advanced mode are two views of the same canonical contract. There
is no separately saved Lego graph and no browser-side agent execution.
