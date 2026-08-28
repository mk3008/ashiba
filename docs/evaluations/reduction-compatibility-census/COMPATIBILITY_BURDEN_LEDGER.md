# Compatibility Burden Ledger

| Legacy surface | Compatibility benefit | Ongoing responsibility | Expected migration | Likely duration | Decision |
| --- | --- | --- | --- | --- | --- |
| Scaffold/DTO/mapper/core | generated apps can regenerate | CLI, layouts, artifacts, mapper rules/tests/docs | replace boundary with SQL/binder/native pg | one major migration | remove with note |
| ZTD/testkit | selected generated SQL tests keep running | wrapper, fixture grammar, pg/testkit matrix, CI/docs | physical application DB test | one major migration | remove with note |
| MySQL adapter | existing package/API compatibility | supported-secondary DBMS coverage, proven lowering/binding generalization, future expansion option; mysql2 version/test/docs | direct native mysql2 is a future package-shape alternative, not a DBMS-support exit | ongoing while DBMS is supported | keep-supported-secondary |
| MSSQL adapter | existing package/API compatibility | supported-secondary DBMS coverage, proven lowering/binding generalization, future expansion option; mssql version/test/docs | direct native mssql is a future package-shape alternative, not a DBMS-support exit | ongoing while DBMS is supported | keep-supported-secondary |
| RFBA | CLI inspection only | architecture semantics/docs/tests | remove command use | none | remove next |

Compatibility benefit is deliberately separate from durable current product
value. MySQL/MSSQL have independent supported-secondary value; their current
adapter shape is not a permanent guarantee.
