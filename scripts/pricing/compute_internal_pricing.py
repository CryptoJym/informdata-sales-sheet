#!/usr/bin/env python3
"""Compute internal AI+SaaS pricing based on InformData costs."""
from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

DEFAULT_VERSION = "1.0.0"
DEFAULT_SOURCE_REF_FIELD = "approval_ref"


def compute(input_path: Path, output_path: Path, margin: float, version: str) -> None:
    df = pd.read_csv(input_path)
    required = {"service_id", "service_name", "unit", "cost_currency", "cost_amount", "effective_date", "approval_ref", "source_system"}
    missing = required - set(df.columns)
    if missing:
        raise SystemExit(f"Input CSV missing required columns: {sorted(missing)}")

    df = df.copy()
    df["base_cost"] = df["cost_amount"].round(2)
    df["currency"] = df["cost_currency"]
    df["ai_saas_margin"] = round(margin, 2)
    df["internal_price"] = (df["base_cost"] + df["ai_saas_margin"]).round(2)
    df["computation_version"] = version
    df["source_cost_ref"] = df[DEFAULT_SOURCE_REF_FIELD]

    columns = [
        "service_id",
        "service_name",
        "unit",
        "currency",
        "base_cost",
        "ai_saas_margin",
        "internal_price",
        "effective_date",
        "computation_version",
        "source_cost_ref",
        "notes",
    ]
    # Ensure notes column exists
    if "notes" not in df.columns:
        df["notes"] = ""

    df[columns].to_csv(output_path, index=False)
    print(f"[INFO] wrote {len(df)} rows to {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Compute internal pricing with AI+SaaS margin")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("data/pricing/internal_pricing.csv"))
    parser.add_argument("--margin", type=float, default=1.0)
    parser.add_argument("--version", default=DEFAULT_VERSION)
    args = parser.parse_args()

    compute(args.input, args.output, args.margin, args.version)


if __name__ == "__main__":
    main()
