# Large-DDL organization experiment

This experiment compares the same deterministic PostgreSQL-like schema in:

1. one `pg_dump`-shaped `dump.sql`; and
2. one `public.<table>.sql` file per table.

The target is `public.orders.status`. The generated fixture has 600 tables and
deliberate false candidates in comments, string literals, similarly named
tables, and non-target `status` columns. It is created under the operating
system temporary directory and is not checked in.

Run from the repository root:

```powershell
node docs/evaluations/remaining-cli-ai-first-ownership/evaluation/ddl-scale/experiment.mjs
```

Use `DDL_SCALE_ITERATIONS=10` to repeat each scenario. The script writes
`raw-results.json` beside itself and prints a compact summary. Timings are
machine-dependent. No token, model, or credit measurement is inferred.

## Method

The `targeted` scenario models a task with a table path convention. In the
single dump, `rg` locates the table declaration and then `rg` locates the
column while Node reads the dump to parse the table block. In the split layout,
`rg --files` discovers `public.orders.sql`, then the same declaration/column
operations are scoped to that one file.

The `recursiveSearch` scenario deliberately does not assume a path convention:
both layouts run the same recursive `rg` searches. This is the control showing
that splitting files by itself does not reduce content scanned by an unscoped
search.

`relevantBytesExamined` and `relevantLinesExamined` count the content scope of
each `rg` call plus bytes/lines read by the extraction parser. Directory-listing
bytes/lines are reported separately. `toolCalls` counts `rg` process invocations;
filesystem reads are reported separately. Elapsed time is wall-clock time from
the local run and is not a token or credit metric.

The result also records total fixture bytes, line counts, SHA-256 hashes, file
count, correctness, raw per-iteration observations, and qualitative
maintenance trade-offs.
