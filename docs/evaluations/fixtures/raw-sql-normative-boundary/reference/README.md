# Runtime reference controls

`runtime-ablation.mjs` runs one edge-case canonical SQL asset through:

- R1: the current `@ashiba-ts/driver-adapter-pg` metadata-backed compiler;
- R2: an application-owned lexical named-to-positional lowering function.

Both must emit the same PostgreSQL SQL and values, then execute the same live query. This is a narrow control for named binding and does not replace tests for R1's source-hash checks, metadata freshness rejection, optional-condition compression, safe sort, observability, error classification, pool behavior, or transaction composition.
