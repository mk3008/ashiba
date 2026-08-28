# Reduction Gate Decision

| Gate | Decision | Current / compatibility value | Breaking / strategy |
| --- | --- | --- | --- |
| Batch 2 scaffold/DTO/mapper | GO-WITH-MIGRATION-NOTE | no Golden Path value; compatibility exposure uncertain | build/runtime for generated consumers; major release + native migration note |
| Batch 3 ZTD/testkit | GO-WITH-MIGRATION-NOTE | no required Golden Path value; compatibility exposure uncertain | test/regeneration; major release + physical-test migration note |
| RFBA | GO-REMOVE | Scope-conflicting architecture inspection | docs/tooling/build; remove-next |
| MySQL adapter | KEEP-SUPPORTED-SECONDARY | supported-secondary DBMS runtime/binding coverage; existing package/API compatibility is additional value | retain for now; adapter shape is revisable, native mysql2 remains execution owner |
| MSSQL adapter | KEEP-SUPPORTED-SECONDARY | supported-secondary DBMS runtime/binding coverage; existing package/API compatibility is additional value | retain for now; adapter shape is revisable, native mssql remains execution owner |

The maintenance surface includes packages, peer-driver/version coupling, CLI,
generated artifacts, tests, docs and migration support. Reconsider Scope-conflict
RFBA only after a human Scope change. MySQL/MSSQL support is a current human
product-direction decision, while either adapter package may later be reduced if
the direct native-driver path makes it redundant. Perf and private `ddl-docs-cli` remain
`needs-one-more-evidence`.
