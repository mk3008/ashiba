# Dependency and prerequisite surface

This is a treatment inventory, not a package-count ranking. Optional
ecosystem capabilities are not counted as mandatory production cost.

| Arm | Frozen normal-path prerequisites | Persistent/stateful surface to inspect |
| --- | --- | --- |
| A | named-parameters tarball and `pg` | visible SQL and application-owned compile/cache choice |
| P | Prisma 8 RC CLI/config, contract/schema, emitted artifacts/types, runtime | generated contract/type lifecycle and Prisma configuration |
| S | sqlc binary, TypeScript plugin, schema/query inputs, generated TS, driver | generated queries/types and generator/config lifecycle |
| D | Drizzle ORM and pg; kit only where needed | builder/schema/config surfaces actually used by candidate |
| K | Kysely and Postgres dialect/driver | builder source and application-owned schema/migration choices |
| G | pg | application-owned SQL and parameter convention |

Exact direct resolutions and status are in [MANIFEST.md](./MANIFEST.md).
This document does not infer transitive dependency counts, package sizes, or
upgrade burden that are not recorded in the durable packet.
