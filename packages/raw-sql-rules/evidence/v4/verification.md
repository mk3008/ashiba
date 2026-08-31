# V4 verification record

The following corrected-treatment candidate commands were rerun:

```text
corrected A1 unit:        4 passed
corrected A1 integration: 1 passed (`RUN_MYSQL_INTEGRATION=1`)
corrected A2:             6 passed (`RUN_DB_TESTS=1`)
corrected B1:             3 passed
```

Each corrected candidate establishes the primary outcome. The MySQL target was
the disposable MySQL 8.4 container and the driver was mysql2 3.22.3 with named
placeholders. Initial preflight candidates and their outputs remain preserved
but are not counted as treatment runs.

Package verification passed with `corepack pnpm --dir packages/raw-sql-rules
test`: `PASS 55 required artifacts`. The final root command `corepack pnpm
test` also passed; it discovered the package-local check and completed the
named-parameters, layered, VSA, and reference workspace tests.
