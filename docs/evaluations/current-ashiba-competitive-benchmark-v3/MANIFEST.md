# Version and official-source manifest

This manifest records sources used to freeze arm versions. The package lockfile
in every candidate snapshot is the final resolution authority. Dates and status
below are observations from the linked first-party sources on 2026-08-30.

| Arm | Frozen version | Status | Official evidence | Normal workflow and prerequisites |
| --- | --- | --- | --- | --- |
| A | `@ashiba-ts/named-parameters` 0.1.0, packed from baseline `80779fbb383de968d00d21d5bf09f765fe536975` | current package | [package source](../../../packages/named-parameters/package.json) | Node 22/24; visible SQL → compiler → binder → native driver |
| P | `prisma` 8.0.0-rc.12 + `@prisma/orm-postgres` 8.0.0-rc.8 | Prisma 8 Release Candidate / current-generation workflow; not GA/stable | [Prisma 8 PostgreSQL quickstart](https://docs.prisma.io/docs/prisma-orm/quickstart/postgresql), [registry metadata](https://registry.npmjs.org/prisma/8.0.0-rc.12) | `prisma.config.ts`, PSL/TypeScript contract, contract emit, contract artifacts/types, Prisma 8 PostgreSQL runtime; exact packet freeze required before scoring |
| P context | Prisma 7.10.0 | fully supported historical predecessor; not scored | [Prisma 7 getting started](https://docs.prisma.io/docs/getting-started) | retained only to distinguish the scored current-generation RC workflow |
| S | sqlc 1.31.1 + `sqlc-gen-typescript` 0.1.3 | core stable; TS plugin early access | [sqlc releases](https://github.com/sqlc-dev/sqlc/releases), [sqlc TypeScript plugin](https://github.com/sqlc-dev/sqlc-gen-typescript), [generate](https://docs.sqlc.dev/en/stable/howto/generate.html) | sqlc binary, `sqlc.yaml`, schema/query inputs, generated TypeScript plus a PostgreSQL driver |
| D | `drizzle-orm` 0.45.2 + `drizzle-kit` 0.31.10 | stable line | [Drizzle releases](https://github.com/drizzle-team/drizzle-orm/releases), [node-postgres setup](https://orm.drizzle.team/docs/get-started-postgresql) | `drizzle-orm`, `pg`, schema/config only where normal path requires them; RC line is excluded |
| K | `kysely` 0.29.5 | package stable resolution | [Kysely](https://www.kysely.dev/), [Postgres dialect](https://kysely-org.github.io/kysely-apidoc/classes/PostgresDialect.html) | Kysely + `pg` and `PostgresDialect` |
| G | `pg` 8.23.0 | stable package | [npm package](https://www.npmjs.com/package/pg), [node-postgres connection](https://node-postgres.com/features/connecting) | Node/TypeScript and native pool/client only |
| common | Node 24.18.0 | LTS | [Node 24.18.0 release](https://nodejs.org/en/blog/release/v24.18.0), [release schedule](https://nodejs.org/en/about/previous-releases) | strict TypeScript |
| common | PostgreSQL 18.6 | stable supported major/minor | [PostgreSQL 18 release](https://www.postgresql.org/about/news/postgresql-18-released-3142/), [downloads](https://www.postgresql.org/download/) | runner-owned Docker/connection fixture |

## Version-resolution notes

The Prisma scored arm was corrected before any scored cell by
`PREREGISTRATION_AMENDMENT_2.md`. Registry metadata fixed `prisma` to
8.0.0-rc.12, published 2026-08-26T14:06:49.655Z, with integrity
`sha512-a+o+2lMsUeBl2Fm+DduUrXuHcU7DaI6EO3YmEDa4kVyS2LYVj9hSwl1tcpx4It/fMYq7mQiGaibVL+rIYFjAvQ==`.
The RC status is context, not a score penalty. Drizzle's official current
quickstart references an RC, so the benchmark separately pins the stable line.

## Ashiba distribution artifact

The baseline-local package tarball is committed at
`fixtures/artifacts/ashiba-ts-named-parameters-0.1.0.tgz`. It was built after
the package TypeScript build with npm lifecycle scripts disabled during packing
because the dist output was already produced by the frozen workspace build.
SHA-256: `64B95657AF62120D5B8662224B298CC610A74280E515B33EE485E41247BDCC4D`.
The npm integrity reported by `npm pack` is
`sha512-uPqbsQT23NLY/nuW4lBl49EbxDDRyfOGUmWbiD/amLOcgF6e1shzI47yhQEXxFYtkt3O0thaCF5N+mP17GxJEg==`.
