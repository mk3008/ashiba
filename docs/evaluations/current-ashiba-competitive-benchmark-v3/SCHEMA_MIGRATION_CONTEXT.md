# Schema and migration context

Schema definition, introspection, migration generation/application/history,
and drift detection are surveyed separately from the bounded data-access
matrix. Ashiba does not own migration tooling in the current product boundary.
That is a scope fact, not a primary-workload penalty.

The SD control changes a database fixture without changing candidate source
and records the first observed detection stage. Schema v2 retains one durable
SD document per arm. A/D/G/K/P/S respectively record a static-inspection
failure, typecheck-stage observations, application-execution-stage
observations, candidate-test-stage observations, typecheck-stage observations,
and a mixture of application-execution/not-detected-in-measured-stages
observations across the three mutations. These are fixture-specific stages,
not a quality order: SD does not measure false positive rate, production
freshness, migration lifecycle, or all schema changes. It therefore does not
recommend a schema/migration workflow.
