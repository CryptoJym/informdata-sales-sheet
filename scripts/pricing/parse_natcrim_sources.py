#!/usr/bin/env python3
"""Parse InformData NatCrim source workbook into JSON."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd


def load_sources(path: Path) -> pd.DataFrame:
    # The workbook contains descriptive rows above the header; skip first 4 rows
    df = pd.read_excel(path, sheet_name="Source List", header=4)
    df = df.rename(
        columns={
            "Unnamed: 0": "state",
            "Unnamed: 1": "jurisdiction",
            "Unnamed: 2": "source_name",
            "Unnamed: 3": "record_type",
            "Unnamed: 4": "coverage_notes",
            "Unnamed: 5": "update_date",
        }
    )

    # Drop any rows without a state value or the descriptive header rows
    df = df.dropna(subset=["state", "source_name"], how="all")
    df = df[df["state"].astype(str).str.upper() != "STATE"]
    # Remove prose rows that start with long sentences
    df = df[~df["state"].astype(str).str.startswith("InformData")]

    # Normalise types
    df["state"] = df["state"].astype(str).str.strip().str.upper()
    df["jurisdiction"] = df["jurisdiction"].astype(str).str.strip()
    df["source_name"] = df["source_name"].astype(str).str.strip()
    df["record_type"] = df["record_type"].fillna("Other").astype(str).str.strip()
    df["coverage_notes"] = df["coverage_notes"].fillna("").astype(str).str.strip()
    df["update_date"] = pd.to_datetime(df["update_date"], errors="coerce")

    return df


def to_records(df: pd.DataFrame) -> List[Dict[str, Any]]:
    records: List[Dict[str, Any]] = []
    for row in df.itertuples(index=False):
        records.append(
            {
                "state": row.state,
                "jurisdiction": getattr(row, "jurisdiction", "") or "",
                "source_name": row.source_name,
                "record_type": row.record_type,
                "coverage_notes": getattr(row, "coverage_notes", "") or "",
                "updated_at": row.update_date.isoformat() if pd.notna(row.update_date) else None,
            }
        )
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description="Parse InformData NatCrim source workbook")
    parser.add_argument("--input", type=Path, required=True, help="Path to InformData workbook")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("content/pricing/informdata_natcrim_sources.json"),
        help="Path to write JSON dataset",
    )
    args = parser.parse_args()

    df = load_sources(args.input)
    records = to_records(df)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(records, indent=2))
    print(f"[INFO] wrote {len(records)} records to {args.output}")


if __name__ == "__main__":
    main()
