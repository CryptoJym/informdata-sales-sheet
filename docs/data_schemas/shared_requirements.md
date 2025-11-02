# Shared Data Requirements for InformData Sales Pricing Assets

These requirements apply across every dataset used to build the InformData pricing collateral (raw costs, competitor MSRPs, computed internal pricing, and published collateral tables).

## Field Naming and Keys
- Use `snake_case` column names.
- Include a stable `service_id` string key for every line of pricing data; reuse the same identifier across datasets so joins are deterministic.
- Preserve canonical service names and measurement units as supplied by finance (e.g., `"per_subject"`, `"per_search"`).
- Record currency using ISO 4217 codes (default `USD`).

## Dates and Versioning
- Capture an `effective_date` (ISO 8601 `YYYY-MM-DD`) for any sourced pricing or derived computation.
- When pricing is recomputed, bump the `computation_version` (semantic version string, e.g., `1.0.0`).
- Maintain provenance to the approval artifact (`approval_ref`) so audit trails stay intact.

## Validation Expectations
- Every dataset must validate against its YAML schema before it is committed or exported.
- Schemas enforce:
  - Required columns and canonical ordering.
  - Data types (`string`, `number`, `integer`, `date`, `boolean`).
  - Nullability rules.
  - Enumerations/regex constraints where applicable (e.g., currency codes, URL formats).
  - Primary-key uniqueness for `service_id` or composite keys.
  - Cross-field rules (e.g., `internal_price >= base_cost + ai_saas_margin`).
- Include at least one sample file in `data/pricing/samples/` for each dataset so CI can run validation without touching production files.

## Directory Structure
- `data/pricing/`: authoritative CSV/Parquet files checked into the repo.
- `docs/data_schemas/`: human-readable documentation and YAML schema definitions.
- `scripts/validation/`: Python utilities for schema validation and reports.
- `exports/`: generated pricing collateral (Markdown, HTML bundles, PDFs).

## Audit & Approvals
- Pricing changes must reference the finance/legal ticket (URL or ID) in the dataset records.
- Competitor pricing must cite the public source URL and capture the date observed.
- All validation reports are stored under `docs/data_schemas/reports/` (created automatically by the validator if the directory exists).

Keep this document updated whenever new pricing datasets are introduced or schema rules change.
