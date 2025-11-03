# Pricing Data Inventory

| Dataset | File Path | Status | Owner | Source / Upstream | Notes |
| --- | --- | --- | --- | --- | --- |
| InformData raw costs | `data/pricing/informdata_costs.csv` | TBD (Task 3) | Sales Ops | Finance workbook `Vuplicity LLC Pricing 052925.xlsx` | Contains raw InformData fees prior to margin. |
| Competitor MSRPs | `data/pricing/competitor_msps.csv` | TBD (Task 6) | Market Intel | Public pricing pages, analyst reports | Includes MSRP evidence URLs and observation dates. |
| Internal AI+SaaS pricing | `data/pricing/internal_pricing.csv` | TBD (Task 4 / Task 10) | Sales Ops | Derived from raw costs + $1 margin policy | Drives collateral tables; enforces pricing policy. |
| Collateral tables | `content/pricing/informdata_pricing_table.csv` | TBD (Task 7 / Task 10) | Marketing | Derived from internal pricing + competitor deltas | Powers HTML dashboards and Markdown collateral. |
| National scan coverage | `content/pricing/national_scan_sources.json` | New | Sales Ops | Exported from InformData national database workbook | Drives databases_coverage.html visualization. |
| Source directory (NatCrim) | `content/pricing/informdata_natcrim_sources.json` | New | Sales Ops | Exported from InformData NatCrim source workbook | Drives informdata_source_list.html filtering experience. |
| Validator reports | `docs/data_schemas/reports/*.json` | Auto-generated | QA | Validation CLI output | Produced by `scripts/validation/validate_pricing_data.py`. |
| Schema definitions | `docs/data_schemas/schemas/*.schema.yaml` | Ready | Sales Ops | Manual (Task 11) | Canonical schema for each dataset. |

_Update this inventory whenever new datasets are added or ownership/status changes._