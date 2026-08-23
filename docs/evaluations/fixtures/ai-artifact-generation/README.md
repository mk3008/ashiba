# AI artifact-generation feasibility fixture

This is an evaluation-only fixture for Question 12. It freezes an artifact
contract and asks independent fresh agents to derive artifacts from ordinary
canonical SQL plus application requirements. It does **not** modify an Ashiba
product generator, runtime, or public API.

`workloads/` and `packets/` are the only inputs supplied to C-treatment
replicates. They must not inspect `packages/cli`, existing generated artifacts,
or the B baseline. A replicate may create a temporary script outside this
directory, but its persistent candidate output is only `artifact.json` and a
runner-owned submission record.

The verifier intentionally checks only local/mechanical facts. The evaluator's
native PostgreSQL oracle establishes behavior; it is not supplied as an
expected-coordinate oracle to the replicates.

See `reproduce.md` for the execution order and `../ai-artifact-generation.md`
for the decision report.
