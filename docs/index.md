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
  - title: "Generated code is yours"
    details: "Ashiba writes ordinary TypeScript into your repo, including DTOs, mapper boundaries, query contracts, and runtime metadata. SQL logic tests are explicit and selective."
  - title: "Safety is checked"
    details: "Deterministic contract checks catch stale SQL, DDL, metadata, and editable TypeScript boundaries; selected behavior tests cover semantics those checks cannot prove."
  - title: "No ORM runtime"
    details: "Your app owns native-driver execution of explicit SQL; optional Ashiba preparation/adapters add narrow deterministic convenience. No hidden query DSL or object layer."
---

## Documentation

- [Command API](./generated/api/commands.md)
- [SSSQL notation](./guide/sssql.md)
- [Safe sort](./guide/safe-sort.md)
- [Runtime boundary](./guide/runtime-boundary.md)
- [SQL format](./guide/sql-format.md)
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
