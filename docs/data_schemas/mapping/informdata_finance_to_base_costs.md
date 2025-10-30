# Finance Workbook → Base Costs Schema Mapping

| Finance Field | Base Costs Column | Notes |
| --- | --- | --- |
| `Product` (column A) | `service_name` | Trimmed string; used to derive `service_id`. Special handling for "match no match" rows which inherit the previous product. |
| Derived from `Product` | `service_id` | Uppercase with non-alphanumeric replaced by `_`, plus explicit overrides (e.g., `SOR+` → `SOR_PLUS`, `MVR` → `MVR_STANDARD`). |
| `Jurisdiction` (column B) | `notes` | Retained in notes when it clarifies service scope. |
| `Pricing` (column C) | `cost_amount` | Parsed as float, rounded to two decimals. Non-numeric values are ignored and handled by transformation logic. |
| `Note` (column D) | `notes` | Appended to notes field (e.g., "per subject per call"). |
| Constant | `unit` | Lookup table based on product name (e.g., `per_search`, `per_subject_call`, `per_subject_month`). |
| Constant | `cost_currency` | Always `USD`. |
| Constant | `effective_date` | `2025-07-01` (latest approved pricing batch). |
| Constant | `approval_ref` | `FIN-2025-07-18` (finance approval ticket). |
| Constant | `source_system` | `Vuplicity LLC Pricing 052925.xlsx`. |

## Derivation Rules
- Ignore blank product rows; they provide visual separation in the workbook.
- When `Product` equals "match no match", prepend the previous product (`Federal Criminal` or `Federal Civil`) to keep the record unique.
- Units default to `per_unit` when not explicitly mapped; current dataset covers all values in the finance sheet.
- Script location: `scripts/pricing/extract_informdata_costs.py`.
- Output dataset: `data/pricing/informdata_costs.csv`.
- Validation: `python scripts/validation/validate_pricing_data.py --input data/pricing/informdata_costs.csv --dataset-id base_costs`.
