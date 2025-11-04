#!/usr/bin/env python3
"""Normalize InformData NatCrim workbook into analytics-ready datasets."""

from __future__ import annotations

import argparse
import re
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path
from typing import Dict, Iterable, Optional

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data/pricing"
CONTENT_DIR = PROJECT_ROOT / "content/pricing"
REPORTS_DIR = PROJECT_ROOT / "reports"
CONFIG_DIR = PROJECT_ROOT / "config"


STATE_MAP: Dict[str, str] = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming",
    "DC": "District of Columbia",
    "PR": "Puerto Rico",
    "GU": "Guam",
    "VI": "U.S. Virgin Islands",
    "AS": "American Samoa",
    "MP": "Northern Mariana Islands",
    "UK": "United Kingdom",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="Path to the raw InformData NatCrim workbook")
    parser.add_argument("--snapshot-date", dest="snapshot_date", help="Snapshot date (YYYY-MM-DD). Defaults to date inferred from filename or today.")
    parser.add_argument("--log-missing", dest="missing_log", help="Optional path for missing record count log CSV.")
    return parser.parse_args()


def infer_snapshot_date(path: Path, explicit: Optional[str]) -> date:
    if explicit:
        return datetime.strptime(explicit, "%Y-%m-%d").date()

    match = re.search(r"(20\d{2})[-_]?([01]\d)[-_]?([0-3]\d)", path.name)
    if match:
        year, month, day = match.groups()
        return date(int(year), int(month), int(day))

    return date.today()


def load_raw_dataframe(source: Path) -> pd.DataFrame:
    df = pd.read_excel(source, sheet_name="Source List", header=8, dtype={"State": "string"})
    df = df.rename(
        columns={
            "State": "state_code",
            "Data Type": "record_type",
            "Source Name": "source_name",
            "County/Jurisdiction": "coverage_scope",
            "Update Date": "refresh_date",
            "Number of Records": "record_count",
        }
    )
    return df


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["state_code"] = df["state_code"].str.upper().str.strip()
    df["record_type"] = df["record_type"].astype(str).str.upper().str.strip()
    df["source_name"] = df["source_name"].astype(str).str.strip()
    df["coverage_scope"] = df["coverage_scope"].astype("string").str.strip().fillna("STATEWIDE")
    df.loc[df["coverage_scope"].isin(["", "NONE", "N/A", "NaN"]), "coverage_scope"] = "STATEWIDE"

    df["refresh_date"] = pd.to_datetime(df["refresh_date"], errors="coerce").dt.date
    df["record_count"] = pd.to_numeric(df["record_count"], errors="coerce")

    df["standardized_state"] = df["state_code"]
    df["state_name"] = df["standardized_state"].map(STATE_MAP)

    df["record_count"] = df["record_count"].fillna(0).astype("int64")

    def derive_court_level(row: pd.Series) -> str:
        record_type = row["record_type"]
        scope = (row["coverage_scope"] or "").upper()
        if record_type == "COURT":
            if scope.startswith("STATEWIDE") or scope in {"STATEWIDE", "STATE", "STATE COURT", "STATEWIDE SEARCH"}:
                return "STATEWIDE"
            if scope in {"NATIONAL", "NATIONWIDE"}:
                return "NATIONAL"
            return "COUNTY"
        return "N/A"

    df["court_level"] = df.apply(derive_court_level, axis=1)
    df["refresh_date"] = df["refresh_date"].astype("string")

    columns = [
        "standardized_state",
        "state_name",
        "record_type",
        "source_name",
        "coverage_scope",
        "court_level",
        "refresh_date",
        "record_count",
    ]
    return df[columns]


def load_overrides() -> Iterable[tuple[str | None, str | None, str]]:
    overrides_path = CONFIG_DIR / "natcrim_scope_overrides.csv"
    if not overrides_path.exists():
        return []

    df = pd.read_csv(overrides_path, comment="#", header=None, names=["source_pattern", "scope_pattern", "domain", "notes"])
    df = df.dropna(how="all")
    rules = []
    for _, row in df.iterrows():
        domain = str(row["domain"]).strip().upper() if pd.notna(row["domain"]) else ""
        if not domain:
            continue
        source_pattern = str(row["source_pattern"]).strip() if pd.notna(row["source_pattern"]) else None
        scope_pattern = str(row["scope_pattern"]).strip() if pd.notna(row["scope_pattern"]) else None
        rules.append((source_pattern or None, scope_pattern or None, domain))
    return rules


def classify_domains(df: pd.DataFrame, overrides: Iterable[tuple[str | None, str | None, str]]) -> pd.Series:
    override_rules = list(overrides)

    def match_override(source: str, scope: str) -> Optional[str]:
        for source_pattern, scope_pattern, domain in override_rules:
            if source_pattern and not re.search(source_pattern, source, flags=re.IGNORECASE):
                continue
            if scope_pattern and not re.search(scope_pattern, scope, flags=re.IGNORECASE):
                continue
            return domain
        return None

    def classify(row: pd.Series) -> str:
        source = row["source_name"] or ""
        scope = (row["coverage_scope"] or "").upper()
        record_type = (row["record_type"] or "").upper()

        override_domain = match_override(source, scope)
        if override_domain:
            return override_domain

        upper_source = source.upper()
        if record_type == "DOC" or "CORRECTIONS" in upper_source:
            return "DOC"
        if record_type == "WARRANT" or "WARRANT" in upper_source:
            return "WARRANT"
        if record_type == "SOR" or "SEX OFFENDER" in upper_source:
            return "SEX_OFFENDER"
        if record_type == "ARREST" or "ARREST" in upper_source:
            return "ARREST"
        if record_type == "SWL":
            return "STATEWIDE"
        if "FEDERAL" in scope or "FEDERAL" in upper_source:
            return "FEDERAL"
        if "NATIONAL" in scope or "NATIONWIDE" in scope or "NATIONAL" in upper_source:
            return "NATIONAL"
        if "STATEWIDE" in scope or scope in {"STATE", "STATE COURT", "STATEWIDE SEARCH"}:
            return "STATEWIDE"
        county_terms = [" COUNTY", " PARISH", " BOROUGH", " MUNICIPALITY", " CITY", " TOWNSHIP"]
        if any(term in scope for term in county_terms):
            return "COUNTY"
        if record_type == "COURT":
            return "COUNTY"
        return "OTHER"

    return df.apply(classify, axis=1)


def write_outputs(clean_df: pd.DataFrame, snapshot_stamp: str) -> Dict[str, Path]:
    CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    outputs: Dict[str, Path] = {}

    sources_csv = CONTENT_DIR / f"natcrim_sources_{snapshot_stamp}.csv"
    sources_parquet = CONTENT_DIR / f"natcrim_sources_{snapshot_stamp}.parquet"
    clean_df.to_csv(sources_csv, index=False)
    clean_df.to_parquet(sources_parquet, index=False)
    outputs["sources_csv"] = sources_csv
    outputs["sources_parquet"] = sources_parquet

    state_totals = clean_df.groupby(["standardized_state", "state_name"], as_index=False)["record_count"].sum().sort_values("standardized_state")
    state_totals_path = CONTENT_DIR / f"natcrim_state_totals_{snapshot_stamp}.csv"
    state_totals.to_csv(state_totals_path, index=False)
    outputs["state_totals"] = state_totals_path

    record_type_totals = clean_df.groupby("record_type", as_index=False)["record_count"].sum().sort_values("record_type")
    record_type_totals_path = CONTENT_DIR / f"natcrim_record_type_totals_{snapshot_stamp}.csv"
    record_type_totals.to_csv(record_type_totals_path, index=False)
    outputs["record_type_totals"] = record_type_totals_path

    return outputs


def write_scope_summary(clean_df: pd.DataFrame, snapshot_stamp: str) -> Dict[str, Path]:
    overrides = load_overrides()
    domains = classify_domains(clean_df, overrides)
    scoped_df = clean_df.assign(coverage_domain=domains)

    scope_summary = (
        scoped_df.groupby(["standardized_state", "state_name", "coverage_domain"], as_index=False)
        .agg(source_count=("source_name", "nunique"), total_records=("record_count", "sum"))
        .sort_values(["standardized_state", "coverage_domain"])
    )
    scope_summary_path = CONTENT_DIR / f"natcrim_scope_summary_{snapshot_stamp}.csv"
    scope_summary.to_csv(scope_summary_path, index=False)

    # Duplicate key report for auditability
    dupes_key = scoped_df[["standardized_state", "record_type", "source_name", "coverage_scope"]].astype(str).agg("|".join, axis=1)
    duplicates = scoped_df[dupes_key.duplicated(keep=False)].copy()
    duplicates_path = REPORTS_DIR / f"natcrim_scope_duplicates_{snapshot_stamp}.csv"
    if duplicates.empty:
        duplicates_path.write_text("")
    else:
        duplicates.to_csv(duplicates_path, index=False)

    return {"scope_summary": scope_summary_path, "scope_duplicates": duplicates_path, "scoped_df": scoped_df}


def write_missing_counts(clean_df: pd.DataFrame, snapshot_stamp: str, override_path: Optional[Path]) -> Path:
    missing = clean_df[clean_df["record_count"] == 0][["standardized_state", "record_type", "source_name", "coverage_scope"]]
    log_path = override_path or (REPORTS_DIR / f"natcrim_missing_counts_{snapshot_stamp}.csv")
    log_path.parent.mkdir(parents=True, exist_ok=True)
    if missing.empty:
        log_path.write_text("standardized_state,record_type,source_name,coverage_scope\n")
    else:
        missing.to_csv(log_path, index=False)
    return log_path


def write_qa_reports(scoped_df: pd.DataFrame, snapshot_stamp: str) -> Dict[str, Path]:
    statewide_path = CONTENT_DIR / "informdata_statewide_coverage.csv"
    qa_outputs: Dict[str, Path] = {}

    if statewide_path.exists():
        statewide_df = pd.read_csv(statewide_path)
        statewide_df["state_code"] = statewide_df["state_code"].str.replace("US-", "", regex=False)
        statewide_df["recommended_method"] = statewide_df["recommended_method"].fillna("")

        county_counts = (
            scoped_df[scoped_df["coverage_domain"] == "COUNTY"]
            .groupby("standardized_state")["source_name"].nunique()
            .to_dict()
        )

        needs_county = statewide_df[statewide_df["recommended_method"].str.contains("County", case=False, na=False)]
        missing_states = [
            {
                "code": row["state_code"],
                "name": row["state_name"],
                "reason": "NatCrim dataset has no county-level sources where county researchers are required.",
            }
            for _, row in needs_county.iterrows()
            if county_counts.get(row["state_code"], 0) == 0
        ]
    else:
        missing_states = []

    coverage_report = REPORTS_DIR / f"natcrim_coverage_gaps_{snapshot_stamp}.md"
    stale_report = REPORTS_DIR / f"natcrim_stale_sources_{snapshot_stamp}.csv"

    cutoff = date.today().replace(year=date.today().year - 1)
    stale_sources = scoped_df.copy()
    stale_sources["refresh_date_dt"] = pd.to_datetime(stale_sources["refresh_date"], errors="coerce")
    stale_sources = stale_sources[stale_sources["refresh_date_dt"].dt.date < cutoff][
        [
            "standardized_state",
            "state_name",
            "record_type",
            "source_name",
            "coverage_scope",
            "refresh_date",
        ]
    ]
    stale_sources = stale_sources.fillna({"standardized_state": "UNKNOWN", "state_name": "Unknown"})
    stale_sources.to_csv(stale_report, index=False)

    stale_summary = (
        stale_sources.groupby(["standardized_state", "state_name"], as_index=False)
        .agg(stale_sources=("source_name", "nunique"), oldest_refresh=("refresh_date", "min"))
        .sort_values("stale_sources", ascending=False)
    )

    lines = [
        "# NatCrim Coverage QA Report",
        "",
        f"- **Generated:** {date.today():%Y-%m-%d}",
        f"- **Stale refresh threshold:** {cutoff:%Y-%m-%d}",
        "",
        "## States Lacking County-Level Coverage",
    ]
    if missing_states:
        lines.append("| State | Observation |")
        lines.append("| --- | --- |")
        for item in sorted(missing_states, key=lambda x: x["code"]):
            lines.append(f"| {item['code']} ({item['name']}) | {item['reason']} |")
    else:
        lines.append("No gaps detected — every county-required state has at least one county-level source in the NatCrim dataset.")

    lines.extend(["", "## Sources Older Than 12 Months"])
    if stale_summary.empty:
        lines.append("All sources refreshed within the last 12 months.")
    else:
        lines.append(f"See `{stale_report.relative_to(PROJECT_ROOT)}` for the full export. Top states:")
        lines.append("| State | Stale Sources | Oldest Refresh |")
        lines.append("| --- | --- | --- |")
        for _, row in stale_summary.head(15).iterrows():
            lines.append(f"| {row['standardized_state']} ({row['state_name']}) | {row['stale_sources']} | {row['oldest_refresh']} |")

    coverage_report.write_text("\n".join(lines) + "\n")

    qa_outputs["coverage_report"] = coverage_report
    qa_outputs["stale_report"] = stale_report
    return qa_outputs


def main() -> None:
    args = parse_args()
    source_path = Path(args.source).expanduser().resolve()
    if not source_path.exists():
        raise SystemExit(f"Source workbook not found: {source_path}")

    snapshot = infer_snapshot_date(source_path, args.snapshot_date)
    snapshot_stamp = snapshot.strftime("%Y-%m-%d")

    raw_df = load_raw_dataframe(source_path)
    clean_df = clean_dataframe(raw_df)

    outputs = write_outputs(clean_df, snapshot_stamp)
    scoped_outputs = write_scope_summary(clean_df, snapshot_stamp)
    missing_log_path = write_missing_counts(clean_df, snapshot_stamp, Path(args.missing_log).expanduser() if args.missing_log else None)
    qa_outputs = write_qa_reports(scoped_outputs["scoped_df"], snapshot_stamp)

    total_records = clean_df["record_count"].sum()
    unique_states = clean_df["standardized_state"].nunique()

    print("NatCrim coverage export complete:\n")
    print(f"  Snapshot date: {snapshot_stamp}")
    print(f"  Sources written: {len(clean_df):,}")
    print(f"  Total records: {total_records:,}")
    print(f"  States/territories: {unique_states}")
    print("")
    for label, path in outputs.items():
        print(f"  {label.replace('_', ' ').title():<28} {path.relative_to(PROJECT_ROOT)}")
    print(f"  Scope summary{'':<18} {scoped_outputs['scope_summary'].relative_to(PROJECT_ROOT)}")
    print(f"  Duplicates report{'':<16} {scoped_outputs['scope_duplicates'].relative_to(PROJECT_ROOT)}")
    print(f"  Missing counts log{'':<15} {missing_log_path.relative_to(PROJECT_ROOT)}")
    print(f"  Coverage QA{'':<22} {qa_outputs['coverage_report'].relative_to(PROJECT_ROOT)}")
    print(f"  Stale source export{'':<13} {qa_outputs['stale_report'].relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
