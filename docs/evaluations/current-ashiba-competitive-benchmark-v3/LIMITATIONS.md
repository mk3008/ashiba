# Limitations

1. Two replicates per primary arm/workload provide descriptive observations,
   not a statistical superiority estimate.
2. The Fresh-Agent model profile is one model/environment condition. Training
   familiarity is unobserved; token and credit telemetry are unavailable.
3. PostgreSQL 18.6 and Node 24.18.0 are the measured platform. The study does
   not establish multi-DB, edge, browser, Bun, Deno, or production runtime
   support.
4. The candidate host is Windows. Cells have fresh directories, npm caches,
   database schemas, and least-privilege roles, but not separate OS users or
   network namespaces.
5. Prisma is measured as an RC/current-generation workflow, not a GA/stable
   Prisma 8 release. sqlc's TypeScript plugin is early access.
6. The primary protocol had documented pre-scoring corrections. The original
   evidence is preserved; no candidate cell was scored under invalidated packet
   versions. Secondary controls have their own correction entries.
7. The compact aggregation cannot infer normalized repair causality or final
   secondary meaning when source evidence does not declare it.
8. E1 and SD have one durable record per arm, but remain non-aggregate,
   fixture-specific controls. AF replicate two has heterogeneous standard and
   explicitly retained nonstandard evidence paths; it has no normalized
   cross-cell first-pass/treatment/repair schema. X1 and AF must remain
   non-aggregate controls; no broad exit, drift, open-ended-composition, or
   architecture recommendation is justified from these limited observations.
9. The Prisma treatment review records final `pass` values, but does not
   adjudicate whether raw-SQL-dominant Prisma candidates are representative of
   a normal Prisma client/contract workflow. No raw-SQL proportion is scored.
10. Candidate behavior passes do not independently verify production security,
   observability, performance, deployment, migration policy, or long-term
   upgrade compatibility.
