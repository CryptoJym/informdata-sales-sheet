#!/usr/bin/env python3
"""Build consolidated pricing table with recommended sell guidance."""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict

import pandas as pd

USE_CASES: Dict[str, str] = {
    "ESSENTIAL_CHECK": "Pre-employment screening bundle covering SSN trace, national criminal, and sex offender search—mirrors Checkr Basic+ for volume hiring funnels.",
    "SOR_PLUS": "Standalone sex offender registry search for regulated industries (childcare, education, healthcare).",
    "MVR_STANDARD": "Standard MVR for fleets/delivery to satisfy DOT/FMCSA pull requirements.",
    "MVR_CDLIS": "Commercial driver screening with CDLIS lookup for DOT-regulated fleets.",
    "VERIFICATIONS": "Employment/education verification when candidates hold sensitive roles or credentials.",
    "CRIMINAL_ACTIVITY_MONITORING": "Ongoing post-hire monitoring for finance, healthcare, or education organizations that require continuous alerts.",
    "NAT_CRIMINAL": "National database search for high-volume hiring funnels; pair with county confirms for adjudication.",
    "SSN_TRACE": "Identity validation + alias discovery to determine downstream court searches.",
    "MED_EX_PLUS": "Healthcare exclusion search to meet OIG/SAM screening obligations.",
    "MED_EX_PLUS_MONITORING": "Monthly sanctions monitoring for clinics/hospitals needing continuous compliance.",
    "MED_EX_PRO": "Expanded sanctions search including state boards and disciplinary actions for advanced practitioners.",
    "MED_EX_PRO_MONITORING": "High-frequency monitoring for telehealth networks or multi-state provider rosters.",
    "MED_EX_COMPLETE": "Comprehensive sanctions sweep before onboarding executives or high-risk practitioners.",
    "MED_EX_COMPLETE_MONITORING": "Enterprise-grade sanctions monitoring covering national, state, and abuse registries.",
    "FEDERAL_CRIMINAL": "Federal district criminal search for roles with federal exposure (banking, defense contractors).",
    "FEDERAL_CRIMINAL_MATCH_NO_MATCH": "Result delivery flag tied to federal criminal search adjudication.",
    "FEDERAL_CIVIL": "Federal civil litigation search for executives, investors, or high liability vendor due diligence.",
    "FEDERAL_CIVIL_MATCH_NO_MATCH": "Result delivery flag tied to federal civil search adjudication.",
    "COUNTY_CIVIL_UPPER": "Upper court civil cases for large claim litigation risk.",
    "COUNTY_CIVIL_LOWER": "Lower/small claims court activity for tenant, contractor, or small business risk.",
    "COUNTY_CIVIL_UPPER_LOWER_COMBINED": "Combined court search when both upper/lower visibility required by policy.",
    "INTERNATIONAL_EMPLOYMENT": "Global employment verification for distributed workforce or contractor onboarding.",
    "INTERNATIONAL_EDUCATION": "International degree verification for knowledge workers or visa processes.",
}

COMPLIANCE_NOTES: Dict[str, str] = {
    "ESSENTIAL_CHECK": "FCRA governs consumer reports; follow adverse action process. Includes SSN, national criminal, sex offender components; respect local ban-the-box laws.",
    "MVR_STANDARD": "DPPA/DOT: driver consent required; comply with FMCSA retention schedules and state re-disclosure rules.",
    "MVR_CDLIS": "FMCSA 391.23 for commercial drivers; CDLIS only available to DOT-regulated employers.",
    "CRIMINAL_ACTIVITY_MONITORING": "FCRA + state monitoring laws (e.g., CA ICRAA). Provide opt-in and adverse action notices for new hits.",
    "NAT_CRIMINAL": "Use as pointer search; confirm hits with county/state records before adjudication per PBSA guidelines.",
    "SSN_TRACE": "Identity/authentication check; do not take adverse action solely on SSN trace results (FCRA).",
    "MED_EX_PLUS": "OIG/SAM exclusion screening required for Medicare/Medicaid billing; document results for audits.",
    "MED_EX_PLUS_MONITORING": "Ensure HIPAA/BAA coverage for automated monitoring of provider rosters.",
    "MED_EX_PRO": "Include state board checks; confirm disciplinary actions before adverse action.",
    "MED_EX_COMPLETE": "Supports Joint Commission / NCQA credentialing audits; maintain evidence of checks.",
    "FEDERAL_CRIMINAL": "PACER; verify identity and follow FCRA adverse action workflow.",
    "FEDERAL_CIVIL": "PACER civil docket; often used for executive/vendor diligence under FCRA.",
    "COUNTY_CIVIL_UPPER": "State civil court permissible purpose required; respect retention limits.",
    "COUNTY_CIVIL_LOWER": "Small-claims and eviction records—check local reporting restrictions.",
    "INTERNATIONAL_EMPLOYMENT": "International privacy (GDPR, PIPEDA); obtain candidate release and use approved processors.",
    "INTERNATIONAL_EDUCATION": "Many countries require signed authorizations; confirm institution accreditation.",
}


def recommended_price(row: pd.Series) -> float:
    total_cost = row["total_cost"]
    msrp = row.get("msrp_amount")
    service_id = row["service_id"]

    if service_id == "CRIMINAL_ACTIVITY_MONITORING" and not pd.isna(msrp):
        return round(float(msrp), 2)

    if pd.isna(msrp):
        return round(max(total_cost * 1.25, total_cost + 5.0), 2)

    target = min(float(msrp) - 0.5, float(msrp) * 0.95)
    recommended = max(total_cost + 1.0, target)
    if recommended >= msrp:
        recommended = float(msrp) - 0.25
    return round(max(recommended, total_cost), 2)


def pricing_note(row: pd.Series) -> str:
    msrp = row.get("msrp_amount")
    if bool(row.get("pass_through")):
        return "Pass-through fee; match public MSRP to avoid subsidizing the service."
    if pd.isna(msrp):
        return "No public MSRP; placeholder markup ≈25% above cost until real comps available."
    if row["service_id"] == "CRIMINAL_ACTIVITY_MONITORING":
        return "Match Checkr monthly monitoring to avoid pass-through loss; upsell value via unified reporting."
    if row["service_id"] == "ESSENTIAL_CHECK":
        return "Bundle price sits just under Checkr Basic+ while covering InformData inputs and $1 automation overhead."
    return "Recommended price maintains ≥$1 contribution while positioning slightly under competitor MSRP."


def build(cost_path: Path, internal_path: Path, competitor_path: Path, output_path: Path) -> None:
    cost_df = pd.read_csv(cost_path).rename(columns={"notes": "cost_notes"})
    internal_df = pd.read_csv(internal_path)
    competitor_df = pd.read_csv(competitor_path)

    numeric_cols = [
        "automation_spend",
        "platform_overhead",
        "pass_through_cost",
        "internal_cost",
        "total_cost",
    ]
    for col in numeric_cols:
        if col in internal_df.columns:
            internal_df[col] = internal_df[col].fillna(0.0).astype(float)
    if "pass_through" in internal_df.columns:
        internal_df["pass_through"] = internal_df["pass_through"].fillna(False).astype(bool)

    internal_subset = internal_df[[
        "service_id",
        "automation_spend",
        "platform_overhead",
        "pass_through_cost",
        "internal_cost",
        "total_cost",
        "pass_through",
    ]]

    merged = cost_df.merge(internal_subset, on="service_id", how="left")
    merged["automation_spend"] = merged["automation_spend"].fillna(0.0)
    merged["platform_overhead"] = merged["platform_overhead"].fillna(0.0)
    merged["pass_through_cost"] = merged["pass_through_cost"].fillna(0.0)
    merged["internal_cost"] = merged["internal_cost"].fillna(merged["informdata_cost"])
    merged["total_cost"] = merged["total_cost"].fillna(merged["internal_cost"]).round(2)
    merged["pass_through"] = merged["pass_through"].fillna(False).astype(bool)

    merged = merged.rename(columns={
        "cost_currency": "currency",
    })

    merged = merged.merge(
        competitor_df[[
            "service_id",
            "competitor_name",
            "analogous_service_name",
            "msrp_currency",
            "msrp_amount",
            "evidence_url",
            "observed_date",
            "notes",
        ]],
        on="service_id",
        how="left"
    )

    merged = merged.rename(columns={
        "notes": "competitor_notes",
    })
    if "competitor_notes" not in merged.columns:
        merged["competitor_notes"] = ""

    merged["use_cases"] = merged["service_id"].map(USE_CASES).fillna("(Add use case)")
    merged["compliance_notes"] = merged["service_id"].map(COMPLIANCE_NOTES).fillna("")
    merged["recommended_price"] = merged.apply(recommended_price, axis=1)
    merged["recommended_margin"] = (merged["recommended_price"] - merged["total_cost"]).round(2)
    merged["pricing_notes"] = merged.apply(pricing_note, axis=1)

    essential_vendor_cost = cost_df[cost_df["service_id"].isin(["SSN_TRACE", "SOR_PLUS", "NAT_CRIMINAL"])]["informdata_cost"].sum()
    essential_platform_cost = 1.0
    essential_total = round(essential_vendor_cost + essential_platform_cost, 2)
    essential_competitor = competitor_df.loc[competitor_df["service_id"] == "NAT_CRIMINAL", "msrp_amount"].max()

    essential_row = {
        "service_id": "ESSENTIAL_CHECK",
        "service_name": "Essential Check (SSN + NatCrim + SOR)",
        "category": "Core Service",
        "unit": "per_applicant",
        "informdata_cost": round(essential_vendor_cost, 2),
        "automation_spend": essential_platform_cost,
        "platform_overhead": 0.0,
        "pass_through_cost": 0.0,
        "internal_cost": round(essential_vendor_cost + essential_platform_cost, 2),
        "total_cost": essential_total,
        "pass_through": False,
        "currency": "USD",
        "competitor_name": "Checkr",
        "analogous_service_name": "Basic+ bundle",
        "msrp_currency": "USD",
        "msrp_amount": essential_competitor,
        "evidence_url": "https://checkr.com/pricing",
        "observed_date": "2025-10-30",
        "competitor_notes": "Checkr Basic+ bundles SSN trace, national criminal, sex offender registry, watchlist.",
        "use_cases": USE_CASES["ESSENTIAL_CHECK"],
        "compliance_notes": COMPLIANCE_NOTES["ESSENTIAL_CHECK"],
    }
    essential_row["recommended_price"] = recommended_price(pd.Series(essential_row))
    essential_row["recommended_margin"] = round(essential_row["recommended_price"] - essential_total, 2)
    essential_row["pricing_notes"] = pricing_note(pd.Series(essential_row))
    essential_row["cost_notes"] = "Includes InformData SSN trace, national criminal, and SOR costs plus $1 automation overhead."
    essential_row["competitor_notes"] = "Benchmarked against Checkr Basic+ public MSRP."

    merged = pd.concat([pd.DataFrame([essential_row]), merged], ignore_index=True, sort=False)
    merged["price_delta"] = (merged["msrp_amount"] - merged["total_cost"]).round(2)

    columns = [
        "service_id",
        "service_name",
        "category",
        "unit",
        "informdata_cost",
        "automation_spend",
        "platform_overhead",
        "pass_through_cost",
        "internal_cost",
        "total_cost",
        "currency",
        "competitor_name",
        "analogous_service_name",
        "msrp_amount",
        "msrp_currency",
        "price_delta",
        "recommended_price",
        "recommended_margin",
        "pricing_notes",
        "use_cases",
        "compliance_notes",
        "pass_through",
        "evidence_url",
        "observed_date",
        "cost_notes",
        "competitor_notes",
    ]
    merged = merged[columns]
    merged.sort_values("service_id", inplace=True)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    merged.to_csv(output_path, index=False)
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
