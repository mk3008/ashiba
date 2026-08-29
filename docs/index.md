---
layout: home
hero:
  name: Ashiba
  text: Show me the SQL.
  tagline: Ashiba handles the boring parts.
  image:
    src: /brand/ashiba-logo.jpg
    alt: Ashiba logo
  actions:
    - theme: brand
      text: API
      link: /generated/api/commands
    - theme: alt
      text: Concepts
      link: /concepts/concept-map
features:
  - title: "SQL is yours"
    details: "Keep SQL as application-owned source code. Read it, edit it, review it, and run it in your SQL client."
  - title: "Generated metadata is deterministic"
    details: "Ashiba generates reviewable binding metadata from canonical SQL and can check it for freshness. Application types and semantic tests remain application-owned."
  - title: "Safety is checked"
    details: "Deterministic checks cover binding artifacts and optional database-derived contract facts; application tests cover behavior those checks cannot prove."
  - title: "No ORM runtime"
    details: "Your app owns native-driver execution of explicit SQL. No hidden query DSL or object layer."
---

## Documentation

- [Command API](./generated/api/commands.md)
- [Runtime boundary](./guide/runtime-boundary.md)
- [Driver surface migration](./guide/driver-adapter-migration.md)
- [Optional CLI analysis migration](./guide/optional-cli-analysis-migration.md)
- [PostgreSQL-derived query contracts](./guide/postgres-contract.md)
- [SQL resources and schema compatibility](./guide/sql-resource-compatibility.md)
- [Verification value audit](./evaluations/verification-value-audit.md)
- [AI maintenance Before/After evaluation](./evaluations/ai-maintenance-ab.md)
- [AI-native construction baseline](./evaluations/ai-native-construction-baseline.md)
- [Verifier trust and CLI minimization audit](./evaluations/verifier-trust-and-cli-minimization.md)
- [Proof Lane Declaration Pilot](./evaluations/proof-lane-declaration-pilot.md)
- [Responsibility Placement Audit](./evaluations/responsibility-placement-audit.md)
- [Dynamic SQL Necessity Audit](./evaluations/dynamic-sql-necessity-audit.md)
- [SQL tooling competitive benchmark](./evaluations/sql-tooling-competitive-benchmark.md)
- [AI-native competitive value benchmark](./evaluations/ai-native-competitive-value-benchmark.md)
- [AI-native PostgreSQL competitive benchmark v2](./evaluations/ai-native-postgresql-competitive-benchmark-v2.md)
- [AI-native PostgreSQL competitive benchmark v2 follow-up](./evaluations/ai-native-postgresql-competitive-benchmark-v2-followup.md)
- [Evaluation report self-containment audit](./evaluations/report-quality-audit.md)
- [Minimum responsibility controlled rerun](./evaluations/minimum-ashiba-controlled-rerun.md)
- [Reproducibility and minimum enforcement ablation](./evaluations/reproducibility-minimum-enforcement-ablation.md)
- [Verify repair-value ablation](./evaluations/verify-repair-value-ablation.md)
- [Concept map](./concepts/concept-map.md)
