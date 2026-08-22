# AI-Native PostgreSQL Competitive Benchmark v2 follow-up evidence packet

This is the compact durable packet for the follow-up benchmark. It contains the
frozen design, exact common assignment, reference fixture/application/oracle,
and historical outcome summaries maintained by the evaluator. It intentionally
excludes node modules, agent transcripts, bulk stdout, database dumps, and
complete candidate directories.

Use [reproduce.md](./reproduce.md) for a clone-only reference-control replay.
The replay proves the committed reference control can satisfy T1, T2, and W5;
it is not a rerun of the 30 comparative cells.

## Evidence boundaries

- `reference/` and `evaluator/` are runnable, runner-owned control evidence.
- `prompts/assignment-template.md` preserves the common Fresh-Agent request.
- `starters/` explicitly records that exact historical W5 start snapshots are
  not reconstructable from durable evidence.
- `evidence/` is reserved for the durable machine-readable scored-cell summary
  and generated failure taxonomy.

See `migration-manifest.json` for the inventory and source hashes collected
while moving evidence out of the temporary working directory.
