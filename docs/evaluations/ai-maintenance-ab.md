# AI Maintenance Before/After Evaluation

Date: 2026-08-15

This evaluation measures whether the Verification Value Audit changed the work
and outcomes of an LLM agent maintaining the Ashiba support-inbox example. It
does not measure human typing preference, and it does not assume that fewer
files are valuable unless correctness is preserved.

## Compared baselines

| Cohort | Immutable commit | Meaning |
|---|---|---|
| Before | `33f1cb0f97aac459204bfc5b2e0b2a25e19f90fb` | generated mapping-probe and broader persistent verification surface |
| After | `f334b229cebd421ac5667fa17bdbdfa2564e9be4` | Verification Value Audit result with direct contract checks and selected logic tests |

Three fresh agents ran each baseline in separate worktrees and dedicated
PostgreSQL databases. Agents received the same maintenance prompt without being
told that generated-artifact reduction was under evaluation. The supplied
starting changes were the same: `version_key` was changed to PostgreSQL bigint,
and latest-message ordering was seeded in the wrong ascending direction.

## Workloads

Each run completed the same four changes:

1. **Contract addition:** add `ticket-volume-by-tier`, accepting nullable status
   and returning tier text plus PostgreSQL bigint count.
2. **Finite dynamic search:** add an optional finite `priority` filter from HTTP
   input through canonical SQL and subtractive runtime metadata.
3. **SQL semantic defect:** make ticket 101 select `new message` by fixing the
   window order and adding a regression assertion.
4. **Schema/driver drift:** follow the `version_key integer -> bigint` change,
   treat node-postgres bigint as string at the raw boundary, and preserve the
   existing safe numeric external contract.

## Primary outcomes

### Final correctness

An independent evaluator inspected the final diffs instead of accepting agent
self-reports. Its result differs materially from two self-reports:

| Cohort | Full A–D correctness | Independent result |
|---|---:|---|
| Before | 1/3 | R05 preserved the external numeric version contract; R01/R03 did not |
| After | 3/3 | R02/R04/R06 preserved raw bigint strings and checked external numbers |

All six runs completed A–C. All six recognized that the raw node-postgres bigint
boundary must be a string. Before R01 and R03 nevertheless changed downstream
contracts/tests toward string instead of restoring the existing external
numeric contract with a checked conversion. That is a retained D regression,
so those runs are `partial`, not `done`.

The four fully correct runs established:

- Tier counts were observed as node-postgres strings.
- Priority absent/present behavior and compressed SQL were exercised.
- Ticket 101 returned `new message`.
- Raw `version_key` was a string and the checked application boundary returned
  a number; unsafe-range conversion was rejected.

Before R05's normal `pnpm verify` remained red on 15 pre-existing safe-sort
route cases while 37 cases passed. That agent traced the mismatch to the starting
metadata/request contract and did not expand scope. Its A–D focused suites,
typecheck, drift check, and live evidence passed. Several other runs deliberately
did not execute seed-owning broad route suites against their supplied fixtures.
The result is therefore four correct A–D deliveries, two retained D regressions,
and no claim of six identical repository-wide green gates.

### Defect detection

Both baselines detected the seeded SQL order defect and bigint contract drift.
Both exposed two ZTD rewrite limitations in the existing complex query: the
empty-array form and an untyped nullable keyword guard needed equivalent,
explicit PostgreSQL types. No evidence shows that the After baseline found a
database defect the Before baseline could not find. It did, however, lead all
three agents to preserve the application contract where two Before agents
misrepaired it.

The measured result is better final contract preservation plus reduced
maintenance surface and recovery work, not a new class of database guarantee.

### False repair and unnecessary modification

Before agents repeatedly interacted with scaffold-mode analysis/mapping
artifacts. Recorded transient corrections included:

- converting table-oriented generated support back to existing-SQL mode;
- removing broad-refresh metadata hunks on unaffected queries; and
- removing temporary PostgreSQL contracts that pulled unrelated timestamp
  representation drift into the task.

More importantly, R01 and R03 retained a semantic false repair in D: they used
the correct raw string representation as justification for drifting the external
application contract toward string. Their passing edited tests therefore do not
prove the requested compatibility.

After agents still made ordinary implementation retries. One removed temporary
diagnostic contracts after they introduced unrelated `Date` expectations; other
runs removed a redundant scaffold-only test or empty `.gitkeep`. No run retained
these artifacts. The qualitative reduction is consistent with the generated
file counts below, but reports used different terminology for a retry versus a
false repair, so a precise cross-run false-repair median is not defensible.

## Raw measurements

`Read files/bytes` means unique files deliberately opened and their final sizes
as reported by each agent. Broad `rg` matches and Git object reads could not be
assigned exact bytes and were not invented. `Modified repo files` excludes the
supplied DDL and ignored task reports where the report provided that separation.

| Cohort/run | Read files | Read bytes | Modified repo files | Generated/scaffolded modified | Shell | Validation | Retries | Wall time |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Before R01 | 82 | 525,442 | 44 | 22 | 78 | 36 | 10 | 31:59.618 |
| Before R03 | 58 | 395,076 | 44 | 22 | 85 | 42 | 13 | 23:58.421 |
| Before R05 | 66 | 493,763 | 50 | 25 | 175 | 31 | 14 | 37:24.260 |
| After R02 | 65 | 290,605 | 33 | 11 | 66 | 24 | 6 | 19:34.805 |
| After R04 | 67 | 287,461 | 42 | 16 | 61 | 24 | 6 | not observed |
| After R06 | 67 | 270,153 | 41 | 11 | 60 | 25 | 7 | 22:25.000 |

R05 counted every PowerShell history invocation, while other reports counted
their explicit command log. Its shell value is therefore a useful raw value but
the range is partly instrumentation variance. R04 did not record a reliable
start timestamp; its wall time is missing rather than reconstructed from file
timestamps.

## Median and range

| Metric | Before, 3 runs | After, 3 runs | Interpretation |
|---|---:|---:|---|
| deliberately read files | median 66; 58–82 | median 67; 65–67 | file count did not fall |
| deliberately read bytes | median 493,763; 395,076–525,442 | median 287,461; 270,153–290,605 | 41.8% lower median bytes |
| modified repository files | median 44; 44–50 | median 41; 33–42 | 6.8% lower median; implementation choices still varied |
| generated/scaffolded modified | median 22; 22–25 | median 11; 11–16 | 50.0% lower median |
| shell commands | median 85; 78–175 | median 61; 60–66 | 28.2% lower median, with R05 definition caveat |
| validation commands | median 36; 31–42 | median 24; 24–25 | 33.3% lower median |
| retries | median 13; 10–14 | median 6; 6–7 | 53.8% lower median |
| wall time | median 31:59.618; 23:58.421–37:24.260 | **2/3 observed:** median 20:59.903; 19:34.805–22:25.000 | directional only; no complete 3-run After median |

The After wall-time median above is the midpoint of the two observed runs, not
a substitute for the missing third observation. Both observed After runs were
faster than the fastest Before run, but the missing value and differing broad
verification choices prevent a formal causal estimate.

Tool-call totals were not consistently observable. Before R01/R03 reported 104
and 107 calls; After R02 reported 81. R05, R04, and R06 explicitly marked the
metric unavailable. Tokens were unavailable in all six runs, and source bytes
are not called tokens.

## Generated-artifact interaction

The Before runs modified 22, 22, and 25 generated/scaffolded files. The After
runs modified 11, 16, and 11 (median 11, range 11–16). The After cohort therefore
halved the median generated modification count.

This does not mean all generation is waste. Query SQL modules, runtime metadata,
and the selected PostgreSQL contract/ZTD assets still carried observed value.
The removed persistent mapping probes and table-list scaffold artifacts were
the main source of avoidable navigation and repair.

## Fairness and limitations

### Held constant

- baseline commits were immutable;
- prompt and workloads were the same;
- agent allocation used the same execution role and tool permissions;
- each run had a dedicated database with the same starting schema/seed intent;
- no agent was told the comparison hypothesis; and
- no agent committed its workload changes.

### Not perfectly controlled

- The baseline commits differ in more than generated file count. Between the
  two SHAs, the example changed 57 files (`+228/-2,135`), including the verify
  command contract, mapper-to-SQL-logic test migration, generated ZTD removal,
  and route semantic tests. Those changes are the treatment being evaluated,
  but they prevent interpreting the result as a pure agent-capability A/B.
- Agents chose different validation breadth. Some ran seed-owning route suites;
  others preserved the fixture and used read-only live HTTP plus ZTD evidence.
- One Before database contained rows created earlier in that run when its final
  aggregate probe executed. The type/relative behavior remained valid, but raw
  row counts were not comparable.
- Reports counted shell calls, read scans, and authored/scaffolded ownership with
  small definition differences.
- Wall time was missing for one After run, tool-call totals were missing for
  three runs, and tokens were missing for all runs.
- The agents maintained Ashiba on both sides. This is not a Fresh Agent
  comparison of Ashiba against sqlc, Drizzle, or Kysely.

## Conclusion

### Observed

The After cohort achieved full A–D correctness in 3/3 runs; the Before cohort
did so in 1/3, with two retained external-contract regressions in D. Reported
median bytes read fell by 41.8%, validation commands by 33.3%, retries by 53.8%,
and the median generated modification count from 22 to 11. The number of files
deliberately opened did not improve.

### Inferred

The evidence is consistent with the smaller and more behavior-focused
verification/artifact surface:
After agents spent less work converting or repairing generated mapping support,
and all three preserved the external contract. Compiler, database, and
regression evidence remained essential; the result does not support removing
those gates. Because the application harness also changed across the treatment,
the precise contribution of artifact deletion versus better semantic tests is
not isolated.

### Not proven

- a precise wall-time percentage, because one After observation is missing;
- token savings;
- a pure causal estimate for any single audit change;
- the same magnitude of improvement on other applications or query shapes; or
- superiority over sqlc, Drizzle, or Kysely.

The defensible result is: for this four-part Ashiba maintenance task, the After
workflow produced more correct final changes and materially reduced reported
generated evidence, commands, and retries. It does not establish how much of
that improvement comes from each individual audit change or how it generalizes.
