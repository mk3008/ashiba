# Manifest

| Surface | Location | Authority |
| --- | --- | --- |
| Application semantics | `application-requirements.md` | Human-reviewed application contract |
| Candidate boundary | `candidate-contract.md` | Test input, not product decision |
| Schema | `schema.sql` | PostgreSQL fixture schema |
| Canonical SQL | `sql/*.sql` | Reviewable query assets |
| Runtime boundary | `runtime-boundary.md`, `app/` | Application-owned execution |
| Named lowering | `named-lowering.mjs` | Mechanical conversion only |
| Reference application | `app/reference-app.mjs` | `pg` application facade |
| Brownfield assignments | `brownfield-assignments/` | Fresh-agent task packets |
| Independent evaluator | `evaluator.mjs` | Live PostgreSQL E2E authority |
| Results | `results.json` | Machine proof record |
| Reviewer entry point | `review-packet.md` | Human-review packet |
| Adaptive history | `decision-log.md` | Protocol integrity |
| Reproduction | `reproduce.md` | Exact command and limits |
