# Raw SQL normative-boundary audit manifest

## Registration

- Phase: `raw-sql-normative-boundary`
- Baseline: `origin/main` commit `d130dfe`
- Target: PostgreSQL through node-postgres (`pg`)
- Unit: a fresh-agent submission for all four workloads, evaluated by the runner
- Primary question: which small, product-owned SQL rules are necessary, and which existing mechanisms merely implement or explain them?

## Fixed protocol

Every scored G0/G1/G2 cell receives the same task packet, permissions, model profile, and timebox. It writes only its allocated `candidates/<treatment>-r<replicate>/` directory. The evaluator and reference controls are runner-owned; candidate self-reports are not pass evidence. Two replicates are planned for each guidance treatment. No extra cell is added unless `decision-log.md` records an observed ambiguity first.

The common task packet itself fixes several safety/application boundaries, including canonical named SQL, W1 null-guard shape, finite W2 sort capability, and rejection of raw runtime strings reaching SQL. Therefore final reporting interprets G0 as **common task specification only / no Ashiba-specific guidance** rather than an unconstrained general-knowledge condition. The historical assignment text is preserved with a post-run interpretation note.

The runtime ablation is not an agent treatment: R1 and R2 are reviewed reference implementations executed against the same PostgreSQL oracle. R1 uses the current Ashiba PostgreSQL adapter. R2 uses a deliberately small application-owned named-parameter lowering boundary. It does not measure all driver responsibilities.

## Files

| Artifact | Purpose |
| --- | --- |
| `initial-candidate-rules.md` | preregistered seven-rule G1 treatment and selection rationale |
| `proposed-minimum-contract.md` | post-experiment refined design proposal; narrows the syntax exception to the ordering scope actually exercised and records untested requirement semantics |
| `workload-spec.md` | frozen W1–W4 contracts and test inputs |
| `assignment-template.md` | neutral base packet and treatment inserts, plus post-run interpretation note |
| `evaluator/evaluate.mjs` | runner-owned PostgreSQL and source-inspection oracle |
| `reference/` and `runtime-ablation.md` | R1/R2 controls and bounded responsibility comparison |
| `responsibility-inventory.md` | source-linked inventory across Rules, guides, runtime, Verify, scaffold, metadata, and prior evaluations |
| `human-review.md` | reviewability observations for every final candidate artifact |
| `decision-log.md` | protocol changes, comparability notes, and post-run interpretation correction |
| `evidence/dispatch-ledger.md` | worker profile, permissions, deadline, and final timebox outcome per scored cell |
| `evidence/results.json` and `verify-results.mjs` | authoritative evaluator index and its consistency check |
| `reproduce.md` | exact replay steps and limits |

## Non-claims

This is not a general model-capability study, an ORM comparison, a benchmark of developer productivity, or a proof about non-PostgreSQL drivers. A passing R2 does not establish that the current adapter has no product value; it narrows only the claim that an Ashiba-owned adapter is required to execute named canonical SQL safely.

The scored W1 workload does not evaluate omitted/`NULL`/value three-state semantics, and W2 does not establish a general policy for arbitrary finite runtime SQL syntax. Those are explicit interpretation limits rather than missing post-hoc assumptions.
