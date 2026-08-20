---
"@ashiba-ts/cli": patch
"@ashiba-ts/driver-adapter-core": patch
---

Keep only the PostgreSQL contract version, source hash, and driver profile in runtime query metadata.

The complete PostgreSQL-derived contract remains available in `generated/postgres.contract.json` for development verification and review without duplicating it in the application runtime module.
