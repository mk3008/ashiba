# Generated Consumer Survivability

Existing generated applications retain runtime behavior after command removal
until they import removed packages. Removal impact is therefore split rather
than collapsed:

| Removed capability | Impact |
| --- | --- |
| scaffold/feature regeneration | regeneration-only |
| DTO/mapper generation and adapter-core | build/runtime where generated boundary imports remain |
| mapper checks | tooling-only |
| testkit/ZTD generation | test/regeneration |

Migration replaces generated `query.sql.ts`/metadata and adapter wiring with a
small canonical-SQL binding artifact, `bindNamedParameters`, and native `pg`.
The existing Golden Path reference proves that replacement path; a fresh
scaffold-consumer live run is pending Docker availability.
