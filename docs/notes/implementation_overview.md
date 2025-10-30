# InformData Pricing Collateral – Implementation Overview

## Why we built this
- Give the sales team a repeatable, data-backed pricing sheet showing InformData costs, Vuplicity’s $1 AI+SaaS uplift, and public competitor MSRPs.
- Automate extraction and validation so future pricing refreshes are a single command instead of a spreadsheet exercise.
- Package everything into shareable collateral (Markdown brief + Gamma deck) that plugs straight into sales workflows.

## What was delivered
1. **Automation scripts** (`scripts/pricing/`)
   - `extract_informdata_costs.py` normalizes the finance workbook export into `data/pricing/informdata_costs.csv`.
   - `compute_internal_pricing.py` adds the $1 margin and writes `data/pricing/internal_pricing.csv`.
   - `build_pricing_table.py` fuses internal + competitor data into `content/pricing/informdata_pricing_table.csv`.
2. **Validation tooling** (`scripts/validation/validate_pricing_data.py`)
   - YAML schemas under `docs/data_schemas/schemas/` keep datasets consistent.
   - JSON validation reports live in `docs/data_schemas/reports/` for audit trails.
3. **Collateral**
   - Markdown pricing sheet: `docs/sales/pricing_sheet.md`
   - Presentation: https://gamma.app/docs/zdlm8b8chaqwk0y
4. **Source control**
   - GitHub repository: https://github.com/CryptoJym/informdata-sales-sheet

## How to rerun the pipeline
```bash
# 1. Refresh InformData cost data
python scripts/pricing/extract_informdata_costs.py \
  --source "~/Documents/Finance/Statements/Vuplicity LLC Pricing 052925.xlsx" \
  --output data/pricing/informdata_costs.csv

# 2. Recompute internal pricing with $1 margin
python scripts/pricing/compute_internal_pricing.py \
  --input data/pricing/informdata_costs.csv \
  --output data/pricing/internal_pricing.csv \
  --margin 1.0

# 3. Update competitor MSRPs (edit data/pricing/competitor_msps.csv manually, then validate)
python scripts/validation/validate_pricing_data.py \
  --input data/pricing/competitor_msps.csv \
  --schema docs/data_schemas/schemas/competitor_msrps.schema.yaml

# 4. Rebuild consolidated sales table
python scripts/pricing/build_pricing_table.py \
  --output content/pricing/informdata_pricing_table.csv

# 5. Regenerate collateral (update docs/sales/pricing_sheet.md, rerun Gamma deck if desired)
```

## Next recommendations
- Have Finance/Legal complete `Task 8` (review + approvals) before publishing externally.
- Load `content/pricing/informdata_pricing_table.csv` into quoting tools so reps always reflect the $1 margin.
- Schedule a monthly automation run to keep competitor MSRPs current.
