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

## Edit and hand off

1. Edit mission intent, success criteria, nodes, edges, joins, budgets,
   ownership, and recovery.
2. Resolve every client validation issue and run the Python strict validator.
3. Issue a human confirmation receipt for the displayed SHA-256 structure
   hash.
4. Edit the now-unlocked capability-based Agent Team workstreams.
5. Export an Agent Team handoff pack. It remains
   `PENDING_RUNTIME_VALIDATION`; exporting does not recruit or run agents.

Mission and Graph edits invalidate the confirmation receipt. Theme, accent,
density, direction, and other presentation-only edits do not.

## Files

- `default-blueprint.json` — canonical strict graph and team command seed.
- `model.js` — pure validation, hashing, import, confirmation, and handoff
  logic; usable from the browser and Node.
- `app.js` — safe DOM editing, rendering, persistence, dialogs, and downloads.
- `styles.css` — responsive presentation model with midnight and paper themes.
- `model.test.js` — dependency-free Node model tests.

The browser stores a versioned local draft and can import or export complete
JSON. Imports are limited to 1 MiB, bounded in depth and array count, reject
prototype-pollution keys, and never trust imported confirmation or handoff
authority. Do not put credentials or secrets in a blueprint.
