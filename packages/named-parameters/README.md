# @ashiba-ts/named-parameters

Small runtime binding for SQL that was already lowered at build time. It does
not parse canonical SQL or construct SQL syntax; it only maps precomputed
parameter names to an ordered value array for the native driver.

`@ashiba-ts/named-parameters/compiler` is the corresponding build-time
lowering entry point. It is intentionally separate from the runtime execution
path: canonical SQL is compiled before the application runs.
