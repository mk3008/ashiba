# PostgreSQL Preparation Residual Decision

## Final decision

**`REDUCE` the PostgreSQL preparation residual.**

This is a capability-level decision. It does not authorize implementation on
this evaluation branch.

| Surface | Decision | Implementation implication, later |
| --- | --- | --- |
| `@ashiba-ts/driver-adapter-core` | REMOVE candidate | extract only metadata/contract types with an independent consumer, then remove the package |
| `@ashiba-ts/driver-adapter-pg` ordinary preparation | REMOVE from package | use named binding metadata and direct native pg execution for normal queries |
| runtime source-hash gate | REDUCE | build-time freshness normally; retain only with a proof-required transform consumer |
| safe sort | REMOVE from runtime package | keep application finite reviewed map; do not retain metadata splice as a core path |
| optional-condition compression | KEEP OPTIONAL / productization pending | perform a separate narrow productization or removal decision before relocating it |
| contract profile validation | REMOVE from preparation; KEEP OPTIONAL at contract boundary | keep only if standalone contract compatibility needs it |

## Exact reason

The broad package is no longer an execution abstraction, but it still bundles
independent concerns. Named parameter safety is already owned by the named
core; normal freshness is build-time; safe sort has a smaller application
alternative; and contract profiles are adapter-external. Optional compression
alone has demonstrated stale-coordinate prevention before native execution,
but Scope labels it experimental/productization pending. One optional proof is
not evidence to retain all package APIs, types, and compatibility obligations.

## Scope and Golden Path

Scope change required: **no**. Golden Path change required: **no**.

```text
canonical SQL
  -> deterministic binding metadata
  -> bindNamedParameters
  -> native driver
  -> optional PostgreSQL contract
  -> application/live tests
```

The candidate normal path removes the broad pg preparation package, not
parameterized execution or optional PostgreSQL verification.

## Evidence strength and uncertainty

**Medium.** Phase 2 gives a migrated native execution consumer and live proof.
Focused package tests establish the current guards. The existing dynamic
mechanism ablation supplies the key safe-sort and optional-coordinate contrast.

Uncertainties:

1. optional-condition compression has not received its separate
   productization decision;
2. exact type locations must be determined from consumers during implementation;
3. no new multi-application optional-compression adoption study was run.

## Reconsideration trigger

Reopen a broad pg/core package only if multiple independent applications need
the same non-execution deterministic guard and a narrow contract cannot serve
them. Convenience, existing package names, or a single migrated application
are not sufficient. Reopen optional compression only with evidence for its
specific artifact contract, not as a proxy for adapter ownership.

## Follow-up

The next implementation task should plan a staged reduction:

1. remove ordinary pg preparation, runtime hash, safe-sort, and contract
   profile ownership from the packages;
2. extract or delete core types by real remaining consumer;
3. leave optional compression untouched until its dedicated decision;
4. make each breaking change with a migration note and no compatibility shim.

Do not combine that work with Scope rewriting, named-parameter changes, or
optional-condition productization.
