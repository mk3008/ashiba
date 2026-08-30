# Remaining CLI AI-First Durable Ownership Evaluation

Starting SHA: `0288c0755e7e4a5aa468a5387d95759fedf53d3a`.

## Decision

**Overall: REDUCE.** The current CLI has eleven catalog entries, but only the
named-parameter primitives are inseparable from Builder Mapper execution. The
remaining commands are either a rule that applications can own, optional SQL
proof that is useful outside Ashiba, or a generated/configuration lifecycle
that has become a second scaffold.

| Command / capability | Decision | Short reason |
| --- | --- | --- |
| `check` | REMOVE | It is a `project check` wrapper plus an arbitrary spawned test command; its default can report success after scanning zero SQL files. |
| `config` | REMOVE | It prints a generic starter JSON and exists chiefly to configure other Ashiba commands. |
| `describe command` | REMOVE | It is a discovery layer created by the breadth of the Ashiba CLI itself; normal `--help` and package documentation replace it after reduction. |
| `model-gen` | prior REDUCE | The prior model-gen evaluation supplies the decision: no longer teach it as the default AI-first workflow. |
| `project check` | RULE-ONLY | Its durable operation is compilation of visible SQL; an application-owned verification rule/script can run that primitive without an Ashiba project convention. |
| `postgres-contract` | REHOME-AS-GENERIC-TOOL | PostgreSQL `PREPARE`/catalog contract evidence is useful optional proof, but it is PostgreSQL-generic rather than Builder Mapper-core. |
| `lint` | REHOME-AS-GENERIC-TOOL | DDL-backed table/column/literal checks are deterministic and fail closed, but apply to any static SQL repository. |
| `query uses table` | REHOME-AS-GENERIC-TOOL | AST-first fail-closed impact search has evidence at scale, but is a generic SQL-repository analysis capability. |
| `query uses column` | REHOME-AS-GENERIC-TOOL | Same boundary as table usage. |
| `sql-resource snapshot` | NEEDS-FOCUSED-ABLATION | It writes a fleet artifact and has no current product/CI consumer; its live fleet proof is promising but not enough to justify another generated-state lifecycle. |
| `sql-resource compare` | NEEDS-FOCUSED-ABLATION | It deterministically classifies fleet artifacts, but requires a demonstrated multi-query review workflow independent of snapshot state. |

This is an ownership result, not an instruction to remove useful checks from a
project. `REHOME-AS-GENERIC-TOOL` means the capability may be worth retaining
only after being detached from Ashiba-specific Builder Mapper concepts. The
two `NEEDS-FOCUSED-ABLATION` results are deliberately not treated as KEEP:
neither has a current app/CI consumer, and the existing proof starts from a
generated snapshot the product would also have to maintain.

## Strongest findings

- The Builder Mapper path needs visible SQL, deterministic named compilation,
  missing/unused validation, and native-driver handoff. It does not require a
  project config, command catalog, project-wide wrapper, DDL model, PostgreSQL
  contract, or fleet snapshot.
- `check` and `project check` returned `ok: true` against this repository's
  default root while reporting `sqlFiles: 0`; a zero-coverage green result is
  not an independent fail-closed project gate.
- A 600-table, 724 KB pg_dump-shaped DDL fixture was accurately reduced to the
  relevant table with ordinary `rg` plus a table/unit layout. Known-target
  inspection dropped from 2,171,319 to 3,315 relevant bytes, while an
  unscoped recursive search remained essentially the same size. Repository
  structure, not an Ashiba command, is the deciding control.
- Query-uses scale evidence retains AST-first exactness and parse-failure
  reporting as a real mechanical capability. The same experiment shows why it
  should be a generic SQL analysis tool rather than a core mapper requirement.

## Invariants

No product code, public API, current Scope, Golden Path, current user
documentation, or Skill changed. The prior model-gen decision is an input;
this evaluation does not silently apply its proposed future Golden Path.

Evidence, controls, limitations, and implementation order are linked from
[DECISION.md](./DECISION.md). Raw measurements are in
[`raw-results.json`](./raw-results.json).
