# Reproduce

Use PostgreSQL 18 (or a documented comparable version) and set the
ASHIBA_EVALUATION_DATABASE_URL environment variable to a disposable database.
The evaluators create and remove a nonce schema; they do not alter an existing
application schema.

1. Build the named-parameter package first because the N1 evaluator imports its
   current compiled lexical implementation.
2. Run node evaluator/named-parameter-evaluator.mjs. It verifies the current
   indexed binding contract; the former nested-comment failure remains recorded
   as historical calibration evidence in the decision log.
3. Run node evaluator/n2-artifact-evaluator.mjs.
4. Run node evaluator/named-live-evaluator.mjs.
5. Run node evaluator/postgres-evaluator.mjs.

The last command creates the frozen 200k-row, seven-property, LEFT JOIN
dataset; checks O1/O2/O3 counts; records five EXPLAIN ANALYZE BUFFERS JSON
runs for auto, force_custom_plan, and force_generic_plan; and runs the S1/S2/S3
sort oracle. Evidence is written under evidence/.
