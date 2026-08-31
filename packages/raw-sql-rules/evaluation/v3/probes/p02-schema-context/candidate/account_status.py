"""Account status operations backed by the native sqlite3 driver."""

from pathlib import Path
import sqlite3
from typing import Any


_SQL_DIR = Path(__file__).with_name("sql")


def _load_sql(name: str) -> str:
    return (_SQL_DIR / name).read_text(encoding="utf-8")


def lookup_account_status(connection: sqlite3.Connection, account_id: int) -> dict[str, Any] | None:
    """Return the account identity and status, or None when it does not exist."""
    connection.row_factory = sqlite3.Row
    row = connection.execute(
        _load_sql("lookup_account_status.sql"),
        {"account_id": account_id},
    ).fetchone()
    return dict(row) if row is not None else None


def change_account_status(
    connection: sqlite3.Connection, account_id: int, status: str
) -> bool:
    """Set an account's status and report whether an account was updated."""
    result = connection.execute(
        _load_sql("change_account_status.sql"),
        {"account_id": account_id, "status": status},
    )
    return result.rowcount == 1


def main() -> None:
    """Small executable demonstration against the repository's canonical schema."""
    schema = Path(__file__).parent.parent / "repository" / "schema" / "accounts.sql"
    with sqlite3.connect(":memory:") as connection:
        connection.executescript(schema.read_text(encoding="utf-8"))
        connection.execute(
            _load_sql("seed_account.sql"),
            {
                "id": 1,
                "email": "ana@example.test",
                "status": "active",
                "created_at": "2026-08-31T00:00:00Z",
            },
        )
        print(lookup_account_status(connection, 1))
        change_account_status(connection, 1, "suspended")
        connection.commit()
        print(lookup_account_status(connection, 1))


if __name__ == "__main__":
    main()
