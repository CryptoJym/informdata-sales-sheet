# Schema Conventions

All dataset schemas live under `docs/data_schemas/schemas/` in YAML format.

## YAML Structure
```yaml
dataset_id: base_costs
version: 1.0.0
description: Canonical InformData service cost feed
file_pattern: data/pricing/informdata_costs.csv
primary_key:
  - service_id
fields:
  - name: service_id
    dtype: string
    required: true
    unique: true
    example: SOR_PLUS
  - name: cost_amount
    dtype: number
    required: true
    min: 0
constraints:
  - name: currency_code
    type: regex
    field: cost_currency
    pattern: "^[A-Z]{3}$"
  - name: effective_date_format
    type: date
    field: effective_date
    format: "%Y-%m-%d"
```

### Supported Keys
| Key | Description |
| --- | --- |
| `dataset_id` | Stable identifier for the dataset. |
| `version` | Semantic version for schema changes. |
| `file_pattern` | Glob or explicit path matched by the validator. |
| `primary_key` | List of columns that must be unique when combined. |
| `fields` | Array describing each column (name, dtype, required, allow_null, enum, regex, min, max, example, notes). |
| `constraints` | Additional business rules (regex checks, cross-field comparisons). |

## Data Types
- `string`
- `number`
- `integer`
- `boolean`
- `date` (`YYYY-MM-DD`)

## Cross-field Constraints
Use constraint entries with `type: compare` to assert rules such as `internal_price >= base_cost + ai_saas_margin`.

## Documentation
For each schema, create a short Markdown companion or embed notes within the YAML `description` and field `notes` fields.

## Change Management
- Bump `version` when schema changes.
- Update `docs/data_schemas/acceptance/task11.md` with summary of changes.
- Run the validator against sample files and any impacted datasets before merging.
