# Design System Tokens and Snapshots

This repo now uses a single source of truth for colors, type, spacing, radii, and shadows.

- Tokens: `styles/tokens.css`
- Components: `components/header.html` (injected via `components/include.js`)
- Pages wired to tokens: `national_scan_components.html`, `databases_coverage.html`, `statewide_vs_county.html`, `informdata_source_list.html`

Metrics language used consistently across pages:

- Distinct databases (unique sources) — unique `source_name`
- Dataset listings (incl. county rows) — total rows from snapshot
- States & territories — unique `standardized_state`
- Total records — sum of `record_count`

Snapshots from Figma (placeholder):

- Overview — TODO add image
- Directory — TODO add image
- Fulfillment — TODO add image

