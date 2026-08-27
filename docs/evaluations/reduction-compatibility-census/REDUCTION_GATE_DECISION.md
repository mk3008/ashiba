# Reduction Gate Decision

| Gate | Decision | Current / compatibility value | Breaking / strategy |
| --- | --- | --- | --- |
| Batch 2 scaffold/DTO/mapper | GO-WITH-MIGRATION-NOTE | no Golden Path value; compatibility exposure uncertain | build/runtime for generated consumers; major release + native migration note |
| Batch 3 ZTD/testkit | GO-WITH-MIGRATION-NOTE | no required Golden Path value; compatibility exposure uncertain | test/regeneration; major release + physical-test migration note |
| RFBA | GO-REMOVE | Scope-conflicting architecture inspection | docs/tooling/build; remove-next |
| MySQL adapter | SHORT-FREEZE-THEN-REMOVE | compatibility-only; native driver is replacement | package/consumer build; one bounded compatibility release |
| MSSQL adapter | SHORT-FREEZE-THEN-REMOVE | compatibility-only; native driver is replacement | package/consumer build; one bounded compatibility release |

The maintenance surface includes packages, peer-driver/version coupling, CLI,
generated artifacts, tests, docs and migration support. Reconsider Scope-conflict
RFBA only after a human Scope change. Perf and private `ddl-docs-cli` remain
`needs-one-more-evidence`.
