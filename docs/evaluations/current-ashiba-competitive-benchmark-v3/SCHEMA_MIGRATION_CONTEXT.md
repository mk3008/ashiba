# Schema and migration context

Schema definition, introspection, migration generation/application/history,
and drift detection are surveyed separately from the bounded data-access
matrix. Ashiba does not own migration tooling in the current product boundary.
That is a scope fact, not a primary-workload penalty.

The SD control changes a database fixture without changing candidate source
and records the first observed detection stage. At this result state SD has no
durable runner observations in the aggregate index. Consequently this report
does not compare drift-detection latency or recommend a schema/migration
workflow. Integrated migration ecosystems remain an explicitly unmeasured
adoption dimension pending the control and official-source survey.
