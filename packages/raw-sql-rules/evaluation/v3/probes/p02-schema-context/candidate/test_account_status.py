import sqlite3
import unittest
from pathlib import Path

from account_status import change_account_status, lookup_account_status


class AccountStatusDatabaseTest(unittest.TestCase):
    def setUp(self) -> None:
        self.connection = sqlite3.connect(":memory:")
        schema = Path(__file__).parent.parent / "repository" / "schema" / "accounts.sql"
        self.connection.executescript(schema.read_text(encoding="utf-8"))
        seed = (Path(__file__).parent / "sql" / "seed_account.sql").read_text(encoding="utf-8")
        self.connection.execute(
            seed,
            {
                "id": 7,
                "email": "mika@example.test",
                "status": "active",
                "created_at": "2026-08-31T00:00:00Z",
            },
        )

    def tearDown(self) -> None:
        self.connection.close()

    def test_lookup_reads_status_through_sqlite(self) -> None:
        self.assertEqual(
            lookup_account_status(self.connection, 7),
            {"id": 7, "email": "mika@example.test", "status": "active"},
        )

    def test_change_updates_status_and_lookup_sees_it(self) -> None:
        self.assertTrue(change_account_status(self.connection, 7, "suspended"))
        self.connection.commit()
        self.assertEqual(lookup_account_status(self.connection, 7)["status"], "suspended")

    def test_missing_account_is_not_reported_as_updated(self) -> None:
        self.assertFalse(change_account_status(self.connection, 999, "suspended"))
        self.assertIsNone(lookup_account_status(self.connection, 999))


if __name__ == "__main__":
    unittest.main()
