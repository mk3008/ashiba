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
    details: "Your app runs explicit SQL through a selected thin SQL execution adapter and ordinary TypeScript boundaries. No hidden query DSL or object layer."
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
- [SQL tooling competitive benchmark](./evaluations/sql-tooling-competitive-benchmark.md)
- [Concept map](./concepts/concept-map.md)
