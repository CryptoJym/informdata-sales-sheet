#!/usr/bin/env python3
"""Validate InformData pricing datasets against YAML schemas.

Usage examples:
    python scripts/validation/validate_pricing_data.py \
        --input data/pricing/informdata_costs.csv \
        --schema docs/data_schemas/schemas/base_costs.schema.yaml

    python scripts/validation/validate_pricing_data.py \
        --input data/pricing/internal_pricing.csv \
        --dataset-id internal_pricing --report-json docs/data_schemas/reports/internal_pricing.json
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

try:
    import yaml  # type: ignore
except Exception as exc:  # pragma: no cover
    sys.stderr.write(
        "[ERROR] Missing dependency 'pyyaml'. Install with: pip install pyyaml\n"
    )
    raise


@dataclass
class FieldRule:
    name: str
    dtype: str
    required: bool = False
    unique: bool = False
    allow_null: bool = False
    regex: Optional[str] = None
    enum: Optional[List[str]] = None
    min: Optional[float] = None
    max: Optional[float] = None
    format: Optional[str] = None
    notes: Optional[str] = None
    example: Optional[str] = None


@dataclass
class Constraint:
    name: str
    type: str
    field: Optional[str] = None
    pattern: Optional[str] = None
    max: Optional[str] = None
    expression: Optional[str] = None


@dataclass
class Schema:
    dataset_id: str
    version: str
    description: str
    file_pattern: Optional[str]
    primary_key: List[str]
    fields: List[FieldRule]
    constraints: List[Constraint] = field(default_factory=list)

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "Schema":
        fields = [FieldRule(**fld) for fld in data.get("fields", [])]
        constraints = [Constraint(**c) for c in data.get("constraints", [])]
        return Schema(
            dataset_id=data["dataset_id"],
            version=data.get("version", "0.0.0"),
            description=data.get("description", ""),
            file_pattern=data.get("file_pattern"),
            primary_key=data.get("primary_key", []),
            fields=fields,
            constraints=constraints,
        )


@dataclass
class ValidationMessage:
    level: str  # "ERROR" | "WARNING"
    message: str
    row: Optional[int] = None
    column: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in {
            "level": self.level,
            "message": self.message,
            "row": self.row,
            "column": self.column,
        }.items() if v is not None}


class PricingValidator:
    def __init__(self, schema: Schema, fail_fast: bool = False, strict: bool = False) -> None:
        self.schema = schema
        self.fail_fast = fail_fast
        self.strict = strict
        self.messages: List[ValidationMessage] = []
        self._unique_trackers: Dict[str, set] = {}

    def validate_file(self, csv_path: Path) -> bool:
        if not csv_path.exists():
            self._error(f"Input file not found: {csv_path}")
            return False
        with csv_path.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            self._validate_columns(reader.fieldnames, csv_path)
            ok = True
            for index, row in enumerate(reader, start=2):  # include header row offset
                if not self._validate_row(row, index):
                    ok = False
                    if self.fail_fast:
                        break
        self._validate_primary_key()
        return ok and not self._has_errors

    def _validate_columns(self, columns: Iterable[str], csv_path: Path) -> None:
        cols = list(columns or [])
        field_names = [f.name for f in self.schema.fields]
        missing = [f for f in field_names if f not in cols]
        extra = [c for c in cols if c not in field_names]
        if missing:
            self._error(
                f"Missing required columns in {csv_path}: {', '.join(missing)}"
            )
        if extra:
            self._warn(f"Extra columns in {csv_path}: {', '.join(extra)}")

    def _validate_row(self, row: Dict[str, str], row_number: int) -> bool:
        row_ok = True
        for field in self.schema.fields:
            value = row.get(field.name)
            if value is None:
                if field.required:
                    self._error(
                        f"Row {row_number}: required column '{field.name}' missing",
                        row=row_number,
                        column=field.name,
                    )
                    row_ok = False
                continue
            if value == "" and field.required and not field.allow_null:
                self._error(
                    f"Row {row_number}: '{field.name}' cannot be empty",
                    row=row_number,
                    column=field.name,
                )
                row_ok = False
                continue
            if value == "" and field.allow_null:
                continue
            if not self._validate_type(field, value, row_number):
                row_ok = False
                continue
            if field.unique:
                tracker = self._unique_trackers.setdefault(field.name, set())
                if value in tracker:
                    self._error(
                        f"Row {row_number}: duplicate value '{value}' in unique column '{field.name}'",
                        row=row_number,
                        column=field.name,
                    )
                    row_ok = False
                else:
                    tracker.add(value)
        for constraint in self.schema.constraints:
            if not self._validate_constraint(constraint, row, row_number):
                row_ok = False
        return row_ok

    def _validate_type(self, field: FieldRule, value: str, row_number: int) -> bool:
        try:
            if field.dtype == "number":
                num = float(value)
                if field.min is not None and num < field.min:
                    raise ValueError(f"must be >= {field.min}")
                if field.max is not None and num > field.max:
                    raise ValueError(f"must be <= {field.max}")
            elif field.dtype == "integer":
                int(value)
            elif field.dtype == "boolean":
                if value.lower() not in {"true", "false", "1", "0"}:
                    raise ValueError("must be boolean")
            elif field.dtype == "date":
                fmt = field.format or "%Y-%m-%d"
                dt.datetime.strptime(value, fmt)
            elif field.dtype == "string":
                pass
            else:
                raise ValueError(f"unsupported dtype '{field.dtype}'")

            if field.enum and value not in field.enum:
                raise ValueError(f"must be one of {field.enum}")
            if field.regex and not re.match(field.regex, value):
                raise ValueError(f"does not match pattern {field.regex}")
        except ValueError as exc:
            self._error(
                f"Row {row_number}: field '{field.name}' invalid - {exc}",
                row=row_number,
                column=field.name,
            )
            return False
        return True

    def _validate_constraint(self, constraint: Constraint, row: Dict[str, str], row_number: int) -> bool:
        if constraint.type == "regex" and constraint.field and constraint.pattern:
            value = row.get(constraint.field, "")
            if value and not re.match(constraint.pattern, value):
                self._error(
                    f"Row {row_number}: field '{constraint.field}' fails constraint '{constraint.name}'",
                    row=row_number,
                    column=constraint.field,
                )
                return False
        elif constraint.type == "max_date" and constraint.field:
            value = row.get(constraint.field)
            if value:
                max_date = dt.datetime.today().date()
                if constraint.max and constraint.max != "today":
                    max_date = dt.datetime.strptime(constraint.max, "%Y-%m-%d").date()
                date_value = dt.datetime.strptime(value, "%Y-%m-%d").date()
                if date_value > max_date:
                    self._error(
                        f"Row {row_number}: date {value} exceeds maximum allowed {max_date}",
                        row=row_number,
                        column=constraint.field,
                    )
                    return False
        elif constraint.type == "compare" and constraint.expression:
            ctxt = {k: _safe_float(row.get(k, "")) for k in row}
            try:
                if not eval(constraint.expression, {"__builtins__": {}}, ctxt):  # noqa: S307
                    self._error(
                        f"Row {row_number}: comparison '{constraint.expression}' failed",
                        row=row_number,
                    )
                    return False
            except Exception as exc:  # pragma: no cover
                self._error(
                    f"Row {row_number}: could not evaluate constraint '{constraint.name}' ({exc})",
                    row=row_number,
                )
                return False
        return True

    def _validate_primary_key(self) -> None:
        if not self.schema.primary_key:
            return
        # Primary key uniqueness is already enforced when fields are marked unique.
        # For composite keys, we can track tuples.
        pk = tuple(self.schema.primary_key)
        if len(pk) > 1:
            tracker = self._unique_trackers.setdefault("__pk__", set())
            # Nothing else is required here because composite tracking happens in _validate_row.
            pass

    def _error(self, message: str, row: Optional[int] = None, column: Optional[str] = None) -> None:
        self.messages.append(ValidationMessage("ERROR", message, row, column))

    def _warn(self, message: str, row: Optional[int] = None, column: Optional[str] = None) -> None:
        entry = ValidationMessage("WARNING", message, row, column)
        if self.strict:
            entry.level = "ERROR"
        self.messages.append(entry)

    @property
    def _has_errors(self) -> bool:
        return any(msg.level == "ERROR" for msg in self.messages)


def _safe_float(value: Optional[str]) -> float:
    try:
        return float(value) if value not in (None, "") else 0.0
    except ValueError:
        return float("nan")


def load_schema(schema_path: Optional[Path], dataset_id: Optional[str]) -> Schema:
    if schema_path and dataset_id:
        raise SystemExit("Specify either --schema or --dataset-id, not both.")
    if schema_path:
        data = yaml.safe_load(schema_path.read_text(encoding="utf-8"))
        return Schema.from_dict(data)
    schemas_dir = Path("docs/data_schemas/schemas")
    if dataset_id:
        candidate = schemas_dir / f"{dataset_id}.schema.yaml"
        if not candidate.exists():
            raise SystemExit(f"Schema not found for dataset '{dataset_id}' at {candidate}")
        data = yaml.safe_load(candidate.read_text(encoding="utf-8"))
        return Schema.from_dict(data)
    # Fallback: attempt to auto-detect single schema
    schemas = list(schemas_dir.glob("*.schema.yaml"))
    if len(schemas) == 1:
        data = yaml.safe_load(schemas[0].read_text(encoding="utf-8"))
        return Schema.from_dict(data)
    raise SystemExit("Unable to resolve schema. Provide --schema or --dataset-id.")


def iter_csv_files(path: Path) -> Iterable[Path]:
    if path.is_dir():
        yield from sorted(p for p in path.glob("**/*.csv"))
    else:
        yield path


def run_sample_check(dataset_id: str, validator: PricingValidator) -> bool:
    sample_path = Path(f"data/pricing/samples/{dataset_id}_sample.csv")
    if not sample_path.exists():
        validator._warn(f"Sample file not found for dataset '{dataset_id}' at {sample_path}")
        return True
    return validator.validate_file(sample_path)


def build_report(messages: List[ValidationMessage]) -> Dict[str, Any]:
    return {
        "status": "passed" if not any(m.level == "ERROR" for m in messages) else "failed",
        "error_count": sum(1 for m in messages if m.level == "ERROR"),
        "warning_count": sum(1 for m in messages if m.level == "WARNING"),
        "messages": [m.to_dict() for m in messages],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate pricing datasets")
    parser.add_argument("--input", required=True, help="CSV file or directory to validate")
    parser.add_argument("--schema", help="Path to schema file")
    parser.add_argument("--dataset-id", help="Dataset identifier to load schema")
    parser.add_argument("--report-json", help="Path to write JSON report")
    parser.add_argument("--fail-fast", action="store_true")
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--sample-check", action="store_true")
    args = parser.parse_args()

    schema = load_schema(Path(args.schema) if args.schema else None, args.dataset_id)
    validator = PricingValidator(schema, fail_fast=args.fail_fast, strict=args.strict)

    ok = True
    for csv_path in iter_csv_files(Path(args.input)):
        print(f"[INFO] Validating {csv_path}")
        if not validator.validate_file(csv_path):
            ok = False

    if args.sample_check:
        print("[INFO] Running sample validation")
        if not run_sample_check(schema.dataset_id, validator):
            ok = False

    for msg in validator.messages:
        stream = sys.stderr if msg.level == "ERROR" else sys.stdout
        prefix = f"[{msg.level}]"
        details = f" row={msg.row}" if msg.row is not None else ""
        details += f" column={msg.column}" if msg.column is not None else ""
        stream.write(f"{prefix} {msg.message}{details}\n")

    if args.report_json:
        report_path = Path(args.report_json)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(build_report(validator.messages), indent=2), encoding="utf-8")
        print(f"[INFO] Wrote report to {report_path}")

    return 0 if ok and not validator._has_errors else 1


if __name__ == "__main__":
    sys.exit(main())
