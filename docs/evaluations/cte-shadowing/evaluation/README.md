# Evaluation harness

This directory is deliberately evaluation-only. It is not a product API, CLI,
or fixture framework. `run.mjs` reads canonical SQL sources and demonstrates the
smallest PostgreSQL CTE-shadowing path: typed, parameterized fixture CTEs are
prefixed to the source SQL and the statement runs with `search_path = pg_temp`.

Run with a disposable PostgreSQL database:

```sh
DATABASE_URL=postgres://... node docs/evaluations/cte-shadowing/evaluation/run.mjs
```

The harness writes `benchmark-results.json` in the parent directory. It does
not alter the Reference application or any Ashiba product package.
