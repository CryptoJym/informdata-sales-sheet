# Pricing Data Validator

`python scripts/validation/validate_pricing_data.py`

## Usage
```bash
python scripts/validation/validate_pricing_data.py --input data/pricing/informdata_costs.csv --schema docs/data_schemas/schemas/base_costs.schema.yaml
```

### Arguments
| Flag | Description |
| --- | --- |
| `--input` | Path to a CSV file or directory to validate. |
| `--schema` | Explicit schema file to load. Overrides `file_pattern`. |
| `--dataset-id` | Dataset identifier when multiple schemas exist. |
| `--report-json` | Optional path to write a structured JSON report. |
| `--fail-fast` | Stop after first validation error. |
| `--strict` | Treat warnings as failures. |
| `--sample-check` | Validate sample files under `data/pricing/samples/`. |

## Exit Codes
- `0`: validation succeeded.
- `1`: schema or sample validation failed.
- `2`: configuration error (missing schema, unreadable input, bad YAML).

## Sample Workflow
1. Validate raw costs before committing:
   ```bash
   python scripts/validation/validate_pricing_data.py \
     --input data/pricing/informdata_costs.csv \
     --schema docs/data_schemas/schemas/base_costs.schema.yaml \
     --report-json docs/data_schemas/reports/informdata_costs.json
   ```
2. Validate derived pricing:
   ```bash
   python scripts/validation/validate_pricing_data.py \
     --input data/pricing/internal_pricing.csv \
     --dataset-id internal_pricing
   ```
3. Include in CI via GitHub Actions or pre-commit hook to block invalid datasets.

## Reports
- JSON reports contain a summary (`status`, `error_count`, `warning_count`) and per-row error details.
- Validation logs are also emitted to stdout for quick inspection.

## Dependencies
- Python 3.9+
- `pyyaml` (install via `pip install pyyaml`)
- Standard library only for everything else.

## Development Notes
- Schemas map closely to YAML definitions; ensure new fields are included in both YAML and documentation.
- Extend validation logic in `scripts/validation/validators.py` (future) for reusable rules.
