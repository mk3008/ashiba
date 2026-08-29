# Ordinary Alternative and Migration Boundary

## Replacement boundary

Use one of two application-owned ordinary forms:

```sql
where (:status is null or ticket.status = :status)
```

The nullable guard remains canonical SQL and executes unchanged through normal
named binding; no coordinate metadata or runtime SQL rewrite is needed.

For cases where the application needs a different query shape, use explicit,
visible query variants selected by application code. Do not introduce a new
Ashiba marker DSL, runtime fragment builder, comment metadata format, or
compatibility rewriter.

## Migration impact

Future implementation should:

1. retain canonical optional guards or replace them with application-owned
   visible variants;
2. remove query-level compression opt-in flags and generated coordinate data;
3. remove the runtime rewriter and `query optional` compression-specific
   authoring/refresh commands; and
4. retain or add application/integration/live cases that show omitted, null,
   and present optional-input behavior.

Existing generated metadata may remain ordinary application source during
migration, but it must not force an empty compatibility package or hidden
runtime path.

## What is deliberately lost

The migration loses only pre-execution rejection of stale generated coordinate
metadata. It does not lose parameterized execution, missing/unused validation,
canonical SQL visibility, native driver use, optional PostgreSQL contract, or
application test responsibility.
