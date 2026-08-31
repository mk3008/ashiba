"""Application-facing report using reviewed SQL assets and sqlite's native API."""

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path
from typing import Any


ASSET_DIR = Path(__file__).parent
REPORT_ASSETS = {
    "owner": ASSET_DIR / "queries" / "owner-work-item-report-detailed.sql",
    "leadership": ASSET_DIR / "queries" / "leadership-work-item-report-summary.sql",
}


def report_sql(audience_mode: str) -> str:
    """Select one complete, reviewed statement for an approved audience."""
    try:
        asset = REPORT_ASSETS[audience_mode]
    except KeyError as exc:
        raise ValueError(f"unsupported audience mode: {audience_mode!r}") from exc
    return asset.read_text(encoding="utf-8")


def fetch_owner_report(
    connection: sqlite3.Connection, owner_id: int, audience_mode: str
) -> dict[str, Any]:
    """Execute the selected report through sqlite with a named value binding."""
    connection.row_factory = sqlite3.Row
    row = connection.execute(report_sql(audience_mode), {"ownerId": owner_id}).fetchone()
    if row is None:
        raise LookupError(f"owner report returned no row for owner {owner_id}")
    return dict(row)


def demo_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(":memory:")
    fixtures = Path(__file__).parents[5] / "fixtures" / "schema"
    for schema_asset in (fixtures / "users.sql", fixtures / "work_items.sql"):
        connection.executescript(schema_asset.read_text(encoding="utf-8"))
    connection.executescript((ASSET_DIR / "seed.sql").read_text(encoding="utf-8"))
    return connection


def main() -> None:
    parser = argparse.ArgumentParser(description="run the owner work-item report")
    parser.add_argument("--owner-id", type=int, default=1)
    parser.add_argument("--audience", choices=tuple(REPORT_ASSETS), default="owner")
    args = parser.parse_args()
    with demo_connection() as connection:
        print(json.dumps(fetch_owner_report(connection, args.owner_id, args.audience)))


if __name__ == "__main__":
    main()
