#!/usr/bin/env python3
"""Extract InformData service costs from the finance workbook.

This script normalizes the pricing data present in
`Documents/Finance/Statements/Vuplicity LLC Pricing 052925.xlsx`
into the canonical schema defined in `docs/data_schemas/schemas/base_costs.schema.yaml`.

Usage:
    python scripts/pricing/extract_informdata_costs.py \
        --source \
          ~/Documents/Finance/Statements/Vuplicity\ LLC\ Pricing\ 052925.xlsx \
        --output data/pricing/informdata_costs.csv

Dependencies:
    pip install pandas openpyxl
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Dict

import pandas as pd

UNIT_MAP: Dict[str, str] = {
    "SOR+": "per_search",
    "MVR": "per_search",
    "MVR CDLIS": "per_search",
    "Verifications": "per_subject_call",
    "Criminal Activity Monitoring": "per_subject_month",
    "NAT Criminal": "per_subject",
    "SSN Trace": "per_search",
    "Med Ex Plus": "per_subject",
    "Med Ex Plus Monitoring": "per_subject_month",
    "Med Ex Pro": "per_subject",
    "Med Ex  Pro Monitoring": "per_subject_month",
    "Med Ex Complete": "per_subject",
    "Med Ex Complete Monitoring": "per_subject_month",
    "Federal Criminal": "per_search",
    "Federal Criminal Match/No Match": "per_search",
    "Federal Civil": "per_search",
    "Federal Civil Match/No Match": "per_search",
    "County Civil Upper": "per_search",
    "County Civil Lower": "per_search",
    "County Civil Uper/Lower Combined": "per_search",
    "International  Employment": "per_verification",
    "International Education": "per_verification",
}

SERVICE_ID_OVERRIDES: Dict[str, str] = {
    "SOR+": "SOR_PLUS",
    "MVR": "MVR_STANDARD",
    "MVR CDLIS": "MVR_CDLIS",
    "Verifications": "VERIFICATIONS",
    "Criminal Activity Monitoring": "CRIMINAL_ACTIVITY_MONITORING",
    "NAT Criminal": "NAT_CRIMINAL",
    "SSN Trace": "SSN_TRACE",
    "Med Ex Plus": "MED_EX_PLUS",
    "Med Ex Plus Monitoring": "MED_EX_PLUS_MONITORING",
    "Med Ex Pro": "MED_EX_PRO",
    "Med Ex  Pro Monitoring": "MED_EX_PRO_MONITORING",
    "Med Ex Complete": "MED_EX_COMPLETE",
    "Med Ex Complete Monitoring": "MED_EX_COMPLETE_MONITORING",
    "Federal Criminal": "FEDERAL_CRIMINAL",
    "Federal Criminal Match/No Match": "FEDERAL_CRIMINAL_MATCH_NO_MATCH",
    "Federal Civil": "FEDERAL_CIVIL",
    "Federal Civil Match/No Match": "FEDERAL_CIVIL_MATCH_NO_MATCH",
    "County Civil Upper": "COUNTY_CIVIL_UPPER",
    "County Civil Lower": "COUNTY_CIVIL_LOWER",
    "County Civil Uper/Lower Combined": "COUNTY_CIVIL_UPPER_LOWER_COMBINED",
    "International  Employment": "INTERNATIONAL_EMPLOYMENT",
    "International Education": "INTERNATIONAL_EDUCATION",
}

DEFAULT_EFFECTIVE_DATE = "2025-07-01"
APPROVAL_REF = "FIN-2025-07-18"
SOURCE_SYSTEM_LABEL = "Vuplicity LLC Pricing 052925.xlsx"


def normalise(source: Path, output: Path) -> None:
    df = pd.read_excel(source, sheet_name="SalesProposalPricingSpreadsheet")
    df.columns = [c.strip() for c in df.columns]
    df = df[df["Product"].notna()].copy()
    df["Pricing"] = pd.to_numeric(df["Pricing"], errors="coerce")

    records = []
    prev_product = None
    for _, row in df.iterrows():
        product_raw = str(row["Product"]).strip()
        price = row["Pricing"]
        if pd.isna(price):
            prev_product = product_raw
            continue
        product = product_raw
        if product_raw.lower() == "match no match":
            if prev_product == "Federal Criminal":
                product = "Federal Criminal Match/No Match"
            elif prev_product == "Federal Civil":
                product = "Federal Civil Match/No Match"
            else:
                product = f"{prev_product or 'Service'} Match/No Match"
        note = "" if pd.isna(row["Note"]) else str(row["Note"]).strip()
        unit = UNIT_MAP.get(product) or UNIT_MAP.get(prev_product or "", "per_unit")
        service_id = SERVICE_ID_OVERRIDES.get(product)
        if service_id is None:
            service_id = re.sub(r"[^A-Z0-9]+", "_", product.upper()).strip("_")

        records.append(
            {
                "service_id": service_id,
                "service_name": product,
                "unit": unit,
                "cost_currency": "USD",
                "cost_amount": round(float(price), 2),
                "effective_date": DEFAULT_EFFECTIVE_DATE,
                "approval_ref": APPROVAL_REF,
                "source_system": SOURCE_SYSTEM_LABEL,
                "notes": note,
            }
        )
        prev_product = product_raw

    out = pd.DataFrame(records)
    output.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(output, index=False)
    print(f"[INFO] wrote {len(out)} rows to {output}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize InformData pricing costs")
    parser.add_argument("--source", type=Path, required=True, help="Path to finance workbook")
    parser.add_argument("--output", type=Path, default=Path("data/pricing/informdata_costs.csv"))
    args = parser.parse_args()
    normalise(args.source.expanduser(), args.output)


if __name__ == "__main__":
    main()
