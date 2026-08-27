# Compatibility Burden Ledger

| Legacy surface | Compatibility benefit | Ongoing responsibility | Expected migration | Likely duration | Decision |
| --- | --- | --- | --- | --- | --- |
| Scaffold/DTO/mapper/core | generated apps can regenerate | CLI, layouts, artifacts, mapper rules/tests/docs | replace boundary with SQL/binder/native pg | one major migration | remove with note |
| ZTD/testkit | selected generated SQL tests keep running | wrapper, fixture grammar, pg/testkit matrix, CI/docs | physical application DB test | one major migration | remove with note |
| MySQL adapter | old imports | core + mysql2 peer/version/test/docs | native mysql2 execution | one short release | short freeze then remove |
| MSSQL adapter | old imports | core + mssql peer/version/test/docs | native mssql execution | one short release | short freeze then remove |
| RFBA | CLI inspection only | architecture semantics/docs/tests | remove command use | none | remove next |

Compatibility benefit is deliberately separate from durable current product
value. None of these benefits justify indefinite ownership.
