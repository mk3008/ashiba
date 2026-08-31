import sqlite3
import unittest

from report import demo_connection, fetch_owner_report, report_sql


class OwnerReportTest(unittest.TestCase):
    def setUp(self) -> None:
        self.connection = demo_connection()

    def tearDown(self) -> None:
        self.connection.close()

    def test_owner_mode_returns_aggregates_and_latest_item(self) -> None:
        report = fetch_owner_report(self.connection, 1, "owner")
        self.assertEqual(report["total_work_items"], 3)
        self.assertEqual(report["open_work_items"], 1)
        self.assertEqual(report["in_progress_work_items"], 1)
        self.assertEqual(report["completed_work_items"], 1)
        self.assertEqual(report["total_priority"], 9)
        self.assertEqual(report["latest_work_item_id"], 12)
        self.assertEqual(report["latest_activity_at"], "2026-08-31T10:00:00Z")

    def test_leadership_mode_omits_latest_title(self) -> None:
        report = fetch_owner_report(self.connection, 1, "leadership")
        self.assertEqual(report["total_work_items"], 3)
        self.assertEqual(report["latest_activity_at"], "2026-08-31T10:00:00Z")
        self.assertNotIn("latest_work_item_title", report)

    def test_unapproved_mode_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            report_sql("free-form")

    def test_owner_without_items_has_zero_aggregates(self) -> None:
        empty = fetch_owner_report(self.connection, 99, "leadership")
        self.assertEqual(empty["total_work_items"], 0)
        self.assertEqual(empty["open_work_items"], 0)
        self.assertIsNone(empty["latest_activity_at"])

    def test_native_named_binding_is_used(self) -> None:
        self.assertIn(":ownerId", report_sql("owner"))
        self.assertIsInstance(self.connection, sqlite3.Connection)


if __name__ == "__main__":
    unittest.main()
