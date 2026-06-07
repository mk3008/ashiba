---
"@ashiba-ts/cli": patch
"@ashiba-ts/driver-adapter-pg": patch
---

Recognize typed SSSQL null guards such as `:status::text is null` and `cast(:status as text) is null` when generating optional-condition compression metadata.

The PostgreSQL adapter also realigns prepended safe sort insertion after optional-condition compression rewrites, so stable `ORDER BY` suffixes remain intact when several optional branches are removed before the sort clause.
