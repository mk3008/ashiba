# Arm B — no persistent fleet artifact

Arm B uses no snapshot, generated resource, or comparison JSON. Its operating
model is:

```text
git diff / git show / hashes / rg -> changed-query candidates -> focused review and tests
```

The reproducible baseline compared file identity and hash/path evidence for the
same 20, 300, and 3000-query fleets. It selected exactly the two changed SQL
files at every scale without creating persisted state. Git is fully adequate
for comment/formatting changes, source identity, query add/remove, and visible
SQL review.

It is not a replacement for PostgreSQL boundary classification. Git cannot
classify a database type widening, driver representation change, view/domain
mutation, or prepare failure. Those require a native PostgreSQL check,
application/live tests, or a derived semantic comparator.

This Arm is a deterministic ordinary-tool baseline, not a Fresh-Agent trial.
It demonstrates that large fleets do not require reading every SQL body merely
to locate textual changes; `git` and `rg` reduce candidates first.
