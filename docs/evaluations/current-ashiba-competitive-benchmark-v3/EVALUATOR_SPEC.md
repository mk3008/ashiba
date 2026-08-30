# Evaluator specification

The evaluator creates a unique validated PostgreSQL schema for every cell,
owns DDL, seed data, expected values, unsafe-input controls, concurrent client
connections, and cleanup. Candidate code receives only its runtime connection
details and safe schema identifier. The evaluator dynamically imports the
candidate's frozen public boundary but never changes candidate source.

The oracle checks behaviour through independent parameterized queries. It does
not accept candidate tests or a candidate's "pass" output as authority. It
records Node/PostgreSQL/package versions, fixture and runner hashes, attempted
commands, first failure, final database state, static forbidden-surface scan,
treatment review, cleanup state, and stdout/stderr paths.

For each cell the runner rejects missing exports, use of a wrong/public schema,
and stale result claims. It verifies hostile values are represented as values,
not evaluator-composed SQL. It uses two independent database connections for
T2 and a fresh connection after every mutation assertion.

