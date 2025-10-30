#!/usr/bin/env python3
"""Extract InformData pricing data into normalized datasets.

Outputs
=======
1. Core InformData services with vendor cost, unit, and metadata.
2. Optional statewide criminal pricing table (statewide & "domestic" search pricing).
3. Optional per-jurisdiction court/access fee schedule (auto/manual/vendor fees).

Usage:
    python scripts/pricing/extract_informdata_costs.py \
        --source ~/Documents/Finance/Statements/Vuplicity\ LLC\ Pricing\ 052925.xlsx \
        --core-output data/pricing/informdata_costs.csv \
        --statewide-output data/pricing/informdata_statewide.csv \
        --court-fee-source ~/Downloads/ClientCostsByProcessWithFees_20250731_172111PM..xls \
        --court-fee-output data/pricing/informdata_court_access_fees.csv

Dependencies:
    pip install pandas openpyxl xlrd
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Dict, List, Optional

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


def _slugify(name: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "_", name.upper()).strip("_")


def extract_core_services(source: Path) -> pd.DataFrame:
    df = pd.read_excel(source, sheet_name="SalesProposalPricingSpreadsheet")
    df.columns = [c.strip() for c in df.columns]
    df = df[df["Product"].notna()].copy()
    df["Pricing"] = pd.to_numeric(df["Pricing"], errors="coerce")

    records: List[Dict[str, Optional[str]]] = []
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
        service_id = SERVICE_ID_OVERRIDES.get(product) or _slugify(product)

        records.append(
            {
                "service_id": service_id,
                "service_name": product,
                "category": "Core Service",
                "unit": unit,
                "informdata_cost": round(float(price), 2),
                "cost_currency": "USD",
                "platform_cost_default": 0.0,
                "effective_date": DEFAULT_EFFECTIVE_DATE,
                "approval_ref": APPROVAL_REF,
                "source_system": SOURCE_SYSTEM_LABEL,
                "notes": note,
            }
        )
        prev_product = product_raw

    core = pd.DataFrame(records)
    core.sort_values("service_id", inplace=True)
    return core


def extract_statewide_pricing(source: Path) -> pd.DataFrame:
    df = pd.read_excel(source, sheet_name="County and State Criminal")
    df.columns = [c.strip() for c in df.columns]
    df["Criminal Price"] = pd.to_numeric(df["Criminal Price"], errors="coerce")
    df = df[df["Criminal Price"].notna()].copy()

    records: List[Dict[str, Optional[str]]] = []
    for _, row in df.iterrows():
        product = str(row["Product"]).strip()
        jurisdiction = str(row.get("Jurisdiction", "")).strip()
        if not jurisdiction:
            continue
        price = float(row["Criminal Price"])

        state_code = jurisdiction[:2]
        service_id = f"{_slugify(product)}_{state_code}"
        records.append(
            {
                "service_id": service_id,
                "service_name": product,
                "category": "Statewide Criminal",
                "jurisdiction": jurisdiction,
                "unit": "per_search",
                "informdata_cost": round(price, 2),
                "cost_currency": "USD",
                "platform_cost_default": 0.0,
                "effective_date": DEFAULT_EFFECTIVE_DATE,
                "approval_ref": APPROVAL_REF,
                "source_system": SOURCE_SYSTEM_LABEL,
            }
        )

    statewide = pd.DataFrame(records)
    statewide.sort_values(["service_name", "jurisdiction"], inplace=True)
    return statewide


def extract_court_fees(source: Path) -> pd.DataFrame:
    df = pd.read_excel(source, header=1)
    df.columns = [
        "region",
        "process",
        "search_cost",
        "ten_year_surcharge",
        "court_fee",
        "access_fee",
    ]

    rows: List[Dict[str, Optional[str]]] = []
    current_region = None
    for _, row in df.iterrows():
        region = str(row["region"]).strip()
        process = row["process"]
        if pd.isna(process) or process in ("Process", "", None):
            current_region = region
            continue

        state = None
        if current_region and "|" in current_region:
            state = current_region.split("|")[0].strip()

        rows.append(
            {
                "state_header": current_region,
                "jurisdiction": region,
                "process": str(process).strip(),
                "search_cost": _to_float(row["search_cost"]),
                "ten_year_surcharge": _to_float(row["ten_year_surcharge"]),
                "court_fee": _to_float(row["court_fee"]),
                "access_fee": _to_float(row["access_fee"]),
                "state": state,
            }
        )

    fees = pd.DataFrame(rows)
    fees.fillna({"search_cost": 0.0, "ten_year_surcharge": 0.0, "court_fee": 0.0, "access_fee": 0.0}, inplace=True)
    fees.sort_values(["state", "jurisdiction", "process"], inplace=True)
    return fees


def _to_float(value: Optional[float]) -> float:
    if pd.isna(value):
        return 0.0
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return 0.0


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize InformData pricing costs")
    parser.add_argument("--source", type=Path, required=True, help="Path to finance workbook")
    parser.add_argument("--core-output", type=Path, default=Path("data/pricing/informdata_costs.csv"))
    parser.add_argument("--statewide-output", type=Path, help="Optional path to write statewide criminal pricing")
    parser.add_argument("--court-fee-source", type=Path, help="Optional path to ClientCostsByProcessWithFees workbook")
    parser.add_argument("--court-fee-output", type=Path, help="Optional output path for court/access fee schedule")
    args = parser.parse_args()

    core = extract_core_services(args.source.expanduser())
    args.core_output.parent.mkdir(parents=True, exist_ok=True)
    core.to_csv(args.core_output, index=False)
    print(f"[INFO] wrote {len(core)} core services to {args.core_output}")

    if args.statewide_output:
        statewide = extract_statewide_pricing(args.source.expanduser())
        args.statewide_output.parent.mkdir(parents=True, exist_ok=True)
        statewide.to_csv(args.statewide_output, index=False)
        print(f"[INFO] wrote {len(statewide)} statewide/state criminal rows to {args.statewide_output}")

    if args.court_fee_source and args.court_fee_output:
        fees = extract_court_fees(args.court_fee_source.expanduser())
        args.court_fee_output.parent.mkdir(parents=True, exist_ok=True)
        fees.to_csv(args.court_fee_output, index=False)
        print(f"[INFO] wrote {len(fees)} court/access fee rows to {args.court_fee_output}")


if __name__ == "__main__":
    main()
