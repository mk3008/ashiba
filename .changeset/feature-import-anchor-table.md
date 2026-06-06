---
"@ashiba-ts/cli": patch
---

Record CTE-aware anchor source, anchor table, and physical table metadata when importing existing SQL so CTE-rooted read queries can keep richer mapper analysis without treating CTE names as DDL tables.
