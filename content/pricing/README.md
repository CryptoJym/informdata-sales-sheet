# InformData Pricing & Coverage Data

This folder contains the canonical CSV/Parquet outputs used by the pricing dashboards and sales collateral.

## Naming conventions

- `informdata_*` files are legacy exports that will be kept for historical comparison until downstream tooling flips to the new `natcrim_*` format.
- `natcrim_*.csv` and `.parquet` files share a `natcrim_<data-type>_<snapshot-date>` pattern (UTC date). The parquet is the preferred analytics feed; CSV is for Git diffs and manual inspection.
- Reports live under `reports/` to keep this directory focused on source datasets.

## Key datasets

| File | Description |
| --- | --- |
| `natcrim_sources_2025-10-03.{csv,parquet}` | Canonical NatCrim source list (state, record type, coverage scope, refresh date, counts). |
| `natcrim_state_totals_2025-10-03.csv` | Rollup of total records per state/territory. |
| `natcrim_record_type_totals_2025-10-03.csv` | Record count totals grouped by record type (Court, DOC, SOR, etc.). |
| `natcrim_scope_summary_2025-10-03.csv` | Domain-classified summary with source counts and records per state/domain. |
| `informdata_statewide_coverage.csv` | Statewide vs. county guidance feeding `statewide_vs_county.html`. |

## Refresh workflow

1. Copy the latest SecureShare workbook into `data/pricing/informdata_natcrim_raw_<YYYY-MM-DD>.xlsx`.
2. Run `python scripts/pricing/refresh_natcrim_data.py --source data/pricing/informdata_natcrim_raw_<YYYY-MM-DD>.xlsx --snapshot-date <YYYY-MM-DD>`.
3. Commit the regenerated CSV/Parquet outputs and the QA reports under `reports/`.
4. Redeploy the site so `national_scan_components.html` and related dashboards point at the refreshed files.
5. If the schema changes, update the README and the pipeline docs in `docs/notes/implementation_overview.md`.

