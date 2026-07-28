# Blueprint Web Provenance

## User-supplied design input

On 2026-07-28 the user explicitly directed this repository to keep the layout
and visual design of:

`C:/Users/高杰/Desktop/graph-engineering-skills/1想法/graph-engineering-web(1)/graph-engineering-web/standalone.html`

The supplied standalone file has SHA-256
`f0d638801feb9b07cb97667b2ae667cc247212233c2ae61563ce8741aca5be69`.
Its modular `styles.css` has SHA-256
`e4e2e56c02c01319298d875b87cb90d52c0256b34f5cc9284749e5e9b1bbcb9a`.

The reference is a centered, responsive 1536-by-1024 HTML composition using a
near-black canvas, Cascadia Mono typography, violet/orange/cyan/blue/lime
architecture zones, named Claude/Antigravity/Codex cards, animated workflow
progress, a source-image overlay, and full-screen controls.

## Files carried forward

The layout contract is preserved in `blueprint/reference-diagram.css`. The 38
user-supplied raster files are preserved under
`blueprint/reference-assets/`. Their exact checksums are recorded separately
in `provenance/blueprint-reference-assets.sha256`.

The source package did not identify a repository commit or license for its
reference image, avatar, vendor logos, or cropped icons. Copying them here
follows the user's explicit project direction; it does not assert that those
files are covered by this repository's MIT upstream license. Rights in names,
logos, avatar, and supplied artwork remain with their respective holders.

These files are intentionally excluded from
`provenance/upstream-files.sha256`, which covers only the pinned Third Brain
upstream extraction.

## Repository adaptation

The visual hierarchy and geometry are presentation. They do not redefine the
Graph contract:

- the feedback arrow and continuous-improvement emblem are a bounded temporal
  motif, not a serialized Graph cycle;
- Claude, Antigravity, and Codex are editable runtime adapter descriptors, not
  Graph owners or durable workstream owners;
- capability-only route requests are resolved by the Harness after probes,
  workspace isolation, permission checks, and IPC readiness;
- the browser can declare adapters but cannot claim endpoint health, select a
  route, launch a process, issue readiness evidence, or certify completion;
- the exported Graph and Agent Team command have separate SHA-256 bindings.

Repository-specific integration code includes `index.html`,
`blueprint/app.js`, `blueprint/model.js`, `blueprint/styles.css`, the canonical
contract, tests, and documentation. User-controlled content continues to use
form values or `textContent`; imported HTML, CSS, and JavaScript are not
executed.
