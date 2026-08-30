# Schema and migration context

Schema definition, introspection, migration generation/application/history,
and drift detection are surveyed separately from the bounded data-access
matrix. Ashiba does not own migration tooling in the current product boundary.
That is a scope fact, not a primary-workload penalty.

The SD control changes a database fixture without changing candidate source
and records the first observed detection stage. Schema v2 retains one durable
SD document per arm, with a second corrected H-007 document preserved for
Arm A. The original A static-isolation failure is retained as historical
evidence; the corrected A rerun passes static inspection and completes the
three mutation observations. D/P record typecheck-stage observations, G
records application-execution-stage observations, K records candidate-test
stage observations, and S records a mixture of application-execution and
not-detected-in-measured-stages observations. These are fixture-specific
stages, not a quality order: SD does not measure false positive rate,
production freshness, migration lifecycle, or all schema changes. It therefore
does not recommend a schema/migration workflow.
