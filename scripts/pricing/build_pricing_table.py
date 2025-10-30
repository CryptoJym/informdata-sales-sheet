#!/usr/bin/env python3
"""Build consolidated pricing table combining InformData cost, internal pricing, and competitor MSRP."""
from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

USE_CASES = {
    "SOR_PLUS": "Annual or onboarding screening for regulated employers, staffing, gig marketplaces, and childcare organizations where sex offender exclusions are mandated.",
    "MVR_STANDARD": "Routine driver compliance checks for logistics, delivery, rideshare, or any role operating company vehicles.",
    "MVR_CDLIS": "DOT-regulated fleets needing CDLIS checks for commercial drivers and FMCSA audit readiness.",
    "VERIFICATIONS": "Pre-hire verification of past employment/education when candidates self-report sensitive roles or regulated credentials.",
    "CRIMINAL_ACTIVITY_MONITORING": "Always-on compliance for high-trust roles (finance, healthcare, education) needing near-real-time arrest alerts.",
    "NAT_CRIMINAL": "High-volume hiring funnels needing rapid adjudication from national databases before county confirms.",
    "SSN_TRACE": "Identity validation and alias discovery for any background package prior to deeper court research.",
    "MED_EX_PLUS": "Healthcare compliance to ensure practitioners are not excluded from federal programs (OIG, SAM).",
    "MED_EX_PLUS_MONITORING": "Monthly watchlist sweeps for medical staff to maintain ongoing compliance without manual checking.",
    "MED_EX_PRO": "Expanded sanctions screening covering state boards and disciplinary actions for advanced credentialed staff.",
    "MED_EX_PRO_MONITORING": "Recurring sanctions monitoring for hospitals and telehealth networks needing proactive alerts.",
    "MED_EX_COMPLETE": "Comprehensive healthcare exclusion search when onboarding executives or multi-state practitioners.",
    "MED_EX_COMPLETE_MONITORING": "Enterprise-grade sanctions monitoring across national, state, and abuse registries.",
    "FEDERAL_CRIMINAL": "Roles with federal exposure (banking, defense contractors) where federal court hits change adjudication.",
    "FEDERAL_CIVIL": "Due diligence on executive hires, investors, or vendors involved in federal civil litigation (IP, securities).",
    "COUNTY_CIVIL_UPPER": "High-limit civil searches (Upper Court) for litigation history facing large claims or corporate disputes.",
    "COUNTY_CIVIL_LOWER": "Lower court searches picking up small-claims, landlord/tenant, or misdemeanor civil matters.",
    "COUNTY_CIVIL_UPPER_LOWER_COMBINED": "Full county civil coverage when risk teams require both upper and lower court visibility.",
    "INTERNATIONAL_EMPLOYMENT": "Global hiring for contractors or employees needing verified overseas employment histories.",
    "INTERNATIONAL_EDUCATION": "International degree verification for knowledge-worker and compliance-focused roles.",
}


def build(cost_path: Path, internal_path: Path, competitor_path: Path, output_path: Path) -> None:
    cost_df = pd.read_csv(cost_path)
    internal_df = pd.read_csv(internal_path)
    competitor_df = pd.read_csv(competitor_path)

    merged = (
        cost_df
        .merge(
            internal_df[["service_id", "internal_price", "ai_saas_margin", "currency", "base_cost", "computation_version", "source_cost_ref"]],
            on="service_id"
        )
        .merge(
            competitor_df[["service_id", "competitor_name", "analogous_service_name", "msrp_currency", "msrp_amount", "evidence_url", "observed_date", "notes" ]],
            on="service_id",
            how="left"
        )
    )
    merged = merged.rename(columns={
        "notes_x": "cost_notes",
        "notes_y": "competitor_notes",
        "currency": "internal_currency",
    })
    if "competitor_notes" not in merged.columns:
        merged["competitor_notes"] = ""
    merged["use_cases"] = merged["service_id"].map(USE_CASES).fillna("(Add use case)")
    merged["price_delta"] = (merged["msrp_amount"] - merged["internal_price"]).round(2)

    columns = [
        "service_id",
        "service_name",
        "unit",
        "base_cost",
        "ai_saas_margin",
        "internal_price",
        "internal_currency",
        "competitor_name",
        "analogous_service_name",
        "msrp_amount",
        "msrp_currency",
        "price_delta",
        "evidence_url",
        "observed_date",
        "competitor_notes",
        "use_cases",
        "cost_notes",
        "effective_date",
        "computation_version",
        "source_cost_ref",
    ]
    merged[columns].to_csv(output_path, index=False)
    print(f"[INFO] wrote {len(merged)} rows to {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build consolidated pricing table")
    parser.add_argument("--costs", type=Path, default=Path("data/pricing/informdata_costs.csv"))
    parser.add_argument("--internal", type=Path, default=Path("data/pricing/internal_pricing.csv"))
    parser.add_argument("--competitor", type=Path, default=Path("data/pricing/competitor_msps.csv"))
    parser.add_argument("--output", type=Path, default=Path("content/pricing/informdata_pricing_table.csv"))
    args = parser.parse_args()
    build(args.costs, args.internal, args.competitor, args.output)


if __name__ == "__main__":
    main()
