# Core Surface After Reduction

## Public package

```text
@ashiba-ts/named-parameters
  - bindNamedParameters
  - NamedParameterError
  - compileNamedParameters (from @ashiba-ts/named-parameters/compiler)
```

`compileNamedParameters` is deterministic and returns driver-ready SQL plus parameter names. `bindNamedParameters` validates a caller-provided parameter record and returns separate SQL and values for the native driver.

## Deliberate non-surface

There is no Ashiba CLI, config file, generated binding module, source hash, freshness gate, driver adapter, query executor, sort runtime, migration tool, contract tool, or analysis command.
