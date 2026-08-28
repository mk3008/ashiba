# Perf Command Migration

## Removed

Ashiba perf commands no longer exist. Ashiba does not own a performance
workflow, scenario format, report format, or evidence directory convention.

## Keep

Canonical SQL and existing `perf/`, scenario, plan, measurement, JSON, and
Markdown files remain useful ordinary project evidence. They do not need to be
converted to another Ashiba format.

## Replace with

Use the application and database tools that already execute the query:

```text
canonical SQL
→ native DB tool or driver
→ representative parameters and dataset
→ native timing
→ EXPLAIN / EXPLAIN ANALYZE
→ plain JSON or Markdown evidence
→ human or AI review
```

For PostgreSQL, this can be `pg` or `psql` with `EXPLAIN` or `EXPLAIN ANALYZE`.
Keep parameters and the representative dataset explicit so a reviewer can
understand what was measured.

## Index experiments

Try experimental indexes in a sandbox first. If an index is adopted, put the
schema change through the application's own DDL or migration workflow.

## Why

The removed commands did not mechanically own database execution, timing, plan
provenance, SQL freshness, or dataset identity. Application-owned evidence is
the clearer boundary.
