# Optional predicate comparison requirements

The search has seven independently optional properties: `customerId`,
`assignee`, `status`, `category`, `createdAfter`, `createdBefore`, and
`priority`. For every property: omitted means no predicate, explicit null means
`IS NULL`, and a concrete value means comparison with a bound value.

O1 keeps complete static tri-state guards. O2 starts from complete client-runnable
SQL and subtracts only precomputed predicate ranges for omitted properties. O3
selects only a few whole hot-query assets; it must not enumerate all 3^7 states.

Scored cases include all omitted, high/low selectivity, explicit null, multiple
selective values, mixed states, a skewed hot value, and a rare value.
