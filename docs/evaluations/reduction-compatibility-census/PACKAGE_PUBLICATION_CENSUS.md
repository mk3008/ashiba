# Package Publication Census

| Package | Source | npm latest / publication evidence | Dependencies / peer | Decision relevance |
| --- | --- | --- | --- | --- |
| cli | 0.3.0 | 0.3.0, 2026-06-03 | rawsql-ts, commander, diff | public migration owner |
| named-parameters | 0.1.0 | npm 404 | none | core is not publicly published under this name |
| adapter-core | 0.1.0 | 0.1.0, 2026-05-29 | none | removal affects adapters/scaffold only |
| adapter-pg | 0.1.1 | 0.1.1, 2026-06-02 | peer pg >=8 | optional, not this batch |
| adapter-mysql2 | 0.0.1 | 0.0.1, 2026-05-29 | core; peer mysql2 >=3 | supported-secondary; retain current package for now |
| adapter-mssql | 0.0.1 | 0.0.1, 2026-05-29 | core; peer mssql >=11 | supported-secondary; retain current package for now |
| testkit-adapter-pg | 0.1.0 | 0.1.0, 2026-05-29 | testkit-postgres | legacy test surface |
| ddl-pull-pg-dump | 0.1.0 | 0.1.0, 2026-05-29 | none | optional, not this batch |

No package returned a deprecated flag. Registry metadata does not expose a
reliable dependent census here; no download count is used as adoption evidence.
