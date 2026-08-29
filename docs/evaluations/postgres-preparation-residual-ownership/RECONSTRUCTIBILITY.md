# Reconstructibility and Alternatives

## Smallest normal path

```text
canonical SQL
  -> generated binding metadata
  -> bindNamedParameters
  -> application-owned pg.query(sql, values)
  -> application/live tests
```

This path already exists in the named core and native pg application boundary.
It does not require `preparePostgresQuery` for ordinary query execution.

## Safe sort

A closed finite application map from public sort input to reviewed complete SQL
terms is ordinary application code. The existing ablation found equivalent
hostile-input rejection to the runtime mechanism. Reconstructing that finite
map is cheaper than retaining generated placement metadata, a profile API, and
a general splice path where the early metadata proof is not required.

## Optional compression

The smallest alternative is retained nullable guards or an
application-owned mechanism. Neither reproduces the current early stale
coordinate failure. That is why compression remains optional rather than being
silently reconstructed or removed.

## Contract profile

A contract profile is only meaningful alongside the development-time contract
it describes. A caller can retain it at that optional boundary without a pg
preparation package that merely compares two strings.

## Guardrail

No alternative in this evaluation introduces a comment DSL, positional
manifest, generic SQL composer, new execution adapter, or application
architecture framework. Reconstructibility is not a reason to discard the
one demonstrated optional proof.
