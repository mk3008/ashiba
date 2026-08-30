# Arm A — current persisted snapshot workflow

Arm A uses the current shape:

```text
SQL fleet -> persisted before/after snapshot JSON -> sql-resource compare
```

The evaluation harness writes its JSON files only in a temporary directory,
calls `compareSqlResourceSnapshotFiles`, and removes that directory after each
scale. It never treats the temporary files as a product replacement.

At 20, 300, and 3000 synthetic, structurally realistic queries, a semantic
predicate change and a parameter-set change produced two affected queries in
each fleet. The persisted before/after JSON sizes were 178,199 bytes,
2,667,959 bytes, and 26,715,159 bytes respectively. The complete numbers are
in `evaluation/raw-results.json`.

The existing focused test additionally proves current comparison behavior for
unchanged-SQL PostgreSQL evidence: prepare failure is execution-breaking,
integer widening can be compatible, driver representation changes are contract
changes, enum/domain cases are classified, and a 100-query fleet can suppress
95% of canonical SQL from the compact report.

Limit: the new scale fixture is static/synthetic and does not claim PostgreSQL
catalog truth. Existing live evidence covers the database mutation matrix but
was not rerun because no database URL was configured.
