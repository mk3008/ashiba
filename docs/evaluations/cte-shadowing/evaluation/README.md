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

`rawsql-followup.mjs` is a separate second-stage challenger. It keeps the
existing rawsql-ts packages outside this repository and loads their pinned
external installation so that the evaluation does not create an Ashiba
dependency. It requires PostgreSQL plus an external workspace containing
`@rawsql-ts/testkit-postgres@0.16.9`, `@rawsql-ts/testkit-core`, and `pg`:

```sh
DATABASE_URL=postgres://... RAWSQL_TS_EVAL_ROOT=/path/to/rawsql-evaluation \
  node docs/evaluations/cte-shadowing/evaluation/rawsql-followup.mjs
```

It writes `rawsql-followup-results.json`. The script is experimental evidence,
not an endorsed integration: it compares the same canonical SQL against seeded,
small hand-built CTE, and public rawsql-ts testkit paths using real `pg`.

`parallelism.mjs` is the Stage 3 extension. It uses the same external rawsql-ts
installation and requires `DATABASE_URL` and `RAWSQL_TS_EVAL_ROOT`. It measures
unique independent mapping cases across connection and concurrency matrices,
and writes `parallelism-results.json`.

`sql-logic.mjs` is the Stage 4 scenario-oriented logic evaluator. It loads the
same external package installation, uses base-client `withFixtures(...)`, and
writes `sql-logic-results.json`. The accompanying SQL family and schema are
evaluation-only assets under `evaluation/sql-logic/` and `sql-logic-schema.sql`.
