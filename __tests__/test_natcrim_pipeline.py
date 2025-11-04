import pandas as pd
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def test_total_record_volume_is_within_expected_band():
    path = PROJECT_ROOT / "content/pricing/natcrim_sources_2025-10-03.csv"
    assert path.exists(), "NatCrim sources CSV is missing. Run refresh_natcrim_data.py first."

    df = pd.read_csv(path)
    total_records = int(df["record_count"].sum())

    assert total_records >= 700_000_000, "Total records unexpectedly low. Format likely changed."
    assert total_records <= 900_000_000, "Total records unexpectedly high. Verify upstream workbook."


def test_anchor_sources_present():
    path = PROJECT_ROOT / "content/pricing/natcrim_sources_2025-10-03.csv"
    df = pd.read_csv(path)
    sources = set(df["source_name"].tolist())

    anchor_sources = {
        "Alaska Administrative Office Of The Courts",
        "Florida Department Of Corrections",
        "Texas Department Of Public Safety",
    }

    missing = sorted(anchor_sources - sources)
    assert not missing, f"Anchor sources missing from export: {missing}"


def test_domain_summary_contains_expected_buckets():
    path = PROJECT_ROOT / "content/pricing/natcrim_scope_summary_2025-10-03.csv"
    df = pd.read_csv(path)
    domains = set(df["coverage_domain"].unique())

    expected = {"STATEWIDE", "DOC", "WARRANT", "SEX_OFFENDER", "COUNTY"}
    assert expected.issubset(domains), "Coverage domain summary missing expected buckets"
