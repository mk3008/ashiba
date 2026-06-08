---
"@ashiba-ts/cli": patch
---

Fix CTE-aware table resolution and PostgreSQL optional-condition binding metadata for source-proximal SQL.

DDL-aware lint now carries visible CTE names into nested CTE queries, so CTE-to-CTE references are not reported as missing physical tables. PostgreSQL binding metadata also renders grouped optional-condition removal text with the full SQL placeholder context, preventing refreshed metadata from being rejected at runtime when earlier parameters appear before a grouped optional `where`.
