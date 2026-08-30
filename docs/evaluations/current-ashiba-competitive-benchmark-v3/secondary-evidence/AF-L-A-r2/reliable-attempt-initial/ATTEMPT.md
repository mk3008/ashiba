# AF-L-A-r2 reliable initial attempt

The candidate source was copied from the absolute external candidate root into
the sibling `secondary-candidate-snapshots` attempt directory before any
repair. The external verifier logs were then copied into
`external-evidence/`; source, evidence, and destination paths were checked to
be non-nested.

## Initial candidate action

The candidate implemented the G1 entrypoint and ordinary layered data-access
and application-service seams using the supplied packed Ashiba package and
native `pg`.

## Immediate typecheck and build

The first direct checks, before the later preservation-only re-run, both
exited `2` with these candidate TypeScript errors:

```text
src/application/ticket-service.ts(29,36): error TS2365: Operator '<' cannot be applied to types '{}' and 'number'.
src/application/ticket-service.ts(29,50): error TS2365: Operator '>' cannot be applied to types '{}' and 'number'.
src/application/ticket-service.ts(30,35): error TS2365: Operator '<' cannot be applied to types '{}' and 'number'.
src/application/ticket-service.ts(30,48): error TS2365: Operator '>' cannot be applied to types '{}' and 'number'.
src/application/ticket-service.ts(38,5): error TS2322: Type '{}' is not assignable to type 'number'.
src/application/ticket-service.ts(39,5): error TS2322: Type '{}' is not assignable to type 'number'.
src/data-access/ticket-data-access.ts(47,47): error TS2345: indexed binding is not assignable to the inferred anonymous binding type.
src/data-access/ticket-data-access.ts(117,41): error TS2345: indexed binding is not assignable to the inferred anonymous binding type.
src/data-access/ticket-data-access.ts(122,41): error TS2345: indexed binding is not assignable to the inferred anonymous binding type.
src/data-access/ticket-data-access.ts(133,38): error TS2345: indexed binding is not assignable to the inferred anonymous binding type.
src/data-access/ticket-data-access.ts(136,23): error TS2345: indexed binding is not assignable to the inferred anonymous binding type.
```

The preservation-only capture command was inadvertently invoked from the
repository worktree rather than the external candidate working directory. It
is preserved verbatim under `external-evidence/` as an environment/logging
incident, not as a candidate typecheck result. It exited `2` with a separate
repository resolution failure:

```text
../../../../src/catalog/runtime/_coercions.ts(1,10): error TS2305:
Module '"@rawsql-ts/sql-contract"' has no exported member
'timestampFromDriver'.
```

The direct initial candidate-root result above remains the initial-attempt
result. No runner/oracle was invoked because no built candidate entrypoint
existed. Its runner result is therefore `not-run`, not a behavior result.

## Preservation status

* source snapshot: complete, excluding `node_modules` and `dist`
* stdout/stderr: preserved for typecheck and build
* runner result: not-run due failed build
* cleanup: not yet performed; the fresh external directory remains available
  for the bounded repair sequence
