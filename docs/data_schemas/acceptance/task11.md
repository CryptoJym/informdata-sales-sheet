# Task 11 Acceptance Checklist

## Deliverables
- [x] Directory tree created:
  - `data/pricing/`
  - `data/pricing/samples/`
  - `docs/data_schemas/`
  - `docs/data_schemas/schemas/`
  - `docs/data_schemas/acceptance/`
  - `scripts/validation/`
- [x] Supporting documentation:
  - `docs/data_schemas/shared_requirements.md`
  - `docs/data_schemas/data_inventory.md`
  - `docs/data_schemas/schema_conventions.md`
  - `docs/data_schemas/validator.md`
- [x] YAML schemas for each dataset (base costs, competitor MSRPs, internal pricing).
- [x] Validation CLI (`scripts/validation/validate_pricing_data.py`).
- [x] Sample CSVs in `data/pricing/samples/` (one per schema).
- [x] JSON report directory (`docs/data_schemas/reports/`) created on first validation run.

## Validation Steps
1. Run `python scripts/validation/validate_pricing_data.py --help` to confirm CLI wiring.
2. Validate each sample file using its corresponding schema (reports stored in `docs/data_schemas/reports/`).
3. Confirm exit code `0` and generated report (if `--report-json` supplied).

## Sign-off
- Sales Ops: __________________
- Market Intelligence: __________________
- Finance: __________________
- Legal: __________________

_Note: update this checklist if additional datasets are introduced._