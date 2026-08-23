# Evaluator

The runner owns the PostgreSQL schema, dataset, inputs, plan-cache mode,
EXPLAIN JSON capture, correctness oracle, and result records. SQL-source checks
are supplementary; live database behavior is authoritative.
