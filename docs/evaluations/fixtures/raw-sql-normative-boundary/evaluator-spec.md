# Runner-owned evaluator

`evaluator/evaluate.mjs` creates a fresh PostgreSQL schema, inserts fixed rows, imports a candidate submission, invokes its public query boundary, and writes one JSON record per cell. It controls schema, data, hostile inputs, invocation, inspection checks, and cleanup. It does not import a candidate-authored test or accept a candidate self-report as evidence.

The evaluator proves only the listed cases and shallow source signals; it cannot prove the absence of every SQL-construction path or establish production security. A candidate that has no compatible public boundary is recorded as unevaluable/failed by the shape check, rather than repaired by the runner.
