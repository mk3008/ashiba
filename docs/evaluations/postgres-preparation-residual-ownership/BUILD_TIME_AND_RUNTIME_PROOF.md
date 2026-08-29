# Build-Time and Runtime Proof

## Build-time normal form

`ashiba model-gen <canonical.sql> --out <bindings.ts> --check` proves whether a
checked-in binding artifact matches canonical SQL. It is the normal freshness
check for static SQL sources. `postgres-contract check` independently proves
the freshness of an optional PostgreSQL contract.

## Runtime residuals

The current preparation call recomputes a hash for every supplied SQL string
and compares it to query-model, binding, and contract hashes. This is useful
only when the runtime call has a mutable supplied SQL boundary or when a
coordinate rewrite needs to fail closed before applying an edit.

For the normal static application path, a broad runtime hash gate duplicates a
build-time freshness contract and adds a public package/runtime dependency. It
should therefore be reduced rather than promoted as a general adapter guard.

## Required distinction

Removing a runtime comparison does not remove the source hash itself when a
remaining artifact—such as a standalone contract or optional coordinate
artifact—uses it. A future implementation must retain source identity only at
the boundary that consumes the corresponding generated artifact; it must not
replace this with a generic adapter framework.

## Profile validation

The runtime profile option is an assertion about caller-owned pg parser
configuration. The package does not inspect, install, or configure parsers.
That makes profile validation contract compatibility, not query preparation.
Its optional owner is the standalone PostgreSQL contract boundary.
