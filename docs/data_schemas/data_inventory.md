# Pricing Data Inventory

| Dataset | File Path | Status | Owner | Source / Upstream | Notes |
| --- | --- | --- | --- | --- | --- |
| InformData raw costs | `data/pricing/informdata_costs.csv` | TBD (Task 3) | Sales Ops | Finance workbook `Vuplicity LLC Pricing 052925.xlsx` | Contains raw InformData fees prior to margin. |
| Competitor MSRPs | `data/pricing/competitor_msps.csv` | TBD (Task 6) | Market Intel | Public pricing pages, analyst reports | Includes MSRP evidence URLs and observation dates. |
| Internal AI+SaaS pricing | `data/pricing/internal_pricing.csv` | TBD (Task 4 / Task 10) | Sales Ops | Derived from raw costs + $1 margin policy | Drives collateral tables; enforces pricing policy. |
| Collateral tables | `content/pricing/informdata_pricing_tables.csv` | TBD (Task 7 / Task 10) | Marketing | Derived from internal pricing + competitor deltas | Feeds Gamma export and Markdown collateral. |
| Validator reports | `docs/data_schemas/reports/*.json` | Auto-generated | QA | Validation CLI output | Produced by `scripts/validation/validate_pricing_data.py`. |
| Schema definitions | `docs/data_schemas/schemas/*.schema.yaml` | Ready | Sales Ops | Manual (Task 11) | Canonical schema for each dataset. |

_Update this inventory whenever new datasets are added or ownership/status changes._