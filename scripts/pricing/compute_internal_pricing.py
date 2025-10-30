#!/usr/bin/env python3
"""Compute total cost (vendor + platform) for InformData services."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict

import pandas as pd

DEFAULT_VERSION = "1.0.0"
DEFAULT_PLATFORM_COST = 0.0
DEFAULT_CONFIG_PATH = Path("data/pricing/internal_cost_overrides.json")


def _load_overrides(path: Path | None) -> Dict[str, Any]:
    if path is None:
        return {}
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, dict):
        raise SystemExit(f"Override config at {path} must be a JSON object")
    return data


def _value_for(overrides: Dict[str, Any], service_id: str, key: str, fallback: Any) -> Any:
    defaults = overrides.get("defaults", {}) if isinstance(overrides.get("defaults", {}), dict) else {}
    services = overrides.get("services", {}) if isinstance(overrides.get("services", {}), dict) else {}
    service_cfg = services.get(service_id, {}) if isinstance(services.get(service_id, {}), dict) else {}
    if key in service_cfg:
        return service_cfg[key]
    if key in defaults:
        return defaults[key]
    return fallback


def compute(input_path: Path, output_path: Path, default_platform: float, version: str, config_path: Path | None) -> None:
    df = pd.read_csv(input_path)
    required = {"service_id", "service_name", "unit", "cost_currency", "informdata_cost", "effective_date", "approval_ref", "source_system"}
    missing = required - set(df.columns)
    if missing:
        raise SystemExit(f"Input CSV missing required columns: {sorted(missing)}")

    df = df.copy()
    overrides = _load_overrides(config_path)

    df["automation_spend"] = df["service_id"].apply(
        lambda sid: float(_value_for(overrides, sid, "automation_spend", 0.0))
    )
    df["platform_overhead"] = df["service_id"].apply(
        lambda sid: float(_value_for(overrides, sid, "platform_overhead", default_platform))
    )
    df["pass_through_cost"] = df["service_id"].apply(
        lambda sid: float(_value_for(overrides, sid, "pass_through_cost", 0.0))
    )
    df["pass_through"] = df["service_id"].apply(
        lambda sid: bool(_value_for(overrides, sid, "pass_through", False))
    )

    df["internal_cost"] = (df["informdata_cost"] + df["automation_spend"] + df["platform_overhead"]).round(2)
    df["total_cost"] = (df["internal_cost"] + df["pass_through_cost"]).round(2)
    df["computation_version"] = version

    columns = [
        "service_id",
        "service_name",
        "unit",
        "cost_currency",
        "informdata_cost",
        "automation_spend",
        "platform_overhead",
        "pass_through_cost",
        "internal_cost",
        "total_cost",
        "pass_through",
        "effective_date",
        "computation_version",
        "approval_ref",
        "source_system",
        "notes",
    ]
    if "notes" not in df.columns:
        df["notes"] = ""

    df[columns].to_csv(output_path, index=False)
    print(f"[INFO] wrote {len(df)} rows to {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Compute InformData total costs including platform overhead")
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("data/pricing/internal_pricing.csv"))
    parser.add_argument(
        "--default-platform",
        type=float,
        default=DEFAULT_PLATFORM_COST,
        help="Default platform cost to add when no override exists",
    )
    parser.add_argument("--version", default=DEFAULT_VERSION)
    parser.add_argument(
        "--config",
        type=Path,
        default=DEFAULT_CONFIG_PATH,
        help="Optional JSON config with per-service automation/platform overrides",
    )
    args = parser.parse_args()

    config_path: Path | None = args.config
    if config_path and not config_path.exists():
        config_path = None

    compute(args.input, args.output, args.default_platform, args.version, config_path)


if __name__ == "__main__":
    main()
