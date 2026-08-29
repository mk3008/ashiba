# Generated Metadata Dependency

## What is generated

`model-gen` emits:

* named-parameter bindings for PostgreSQL, mysql2, and mssql;
* source hash and binding freshness target;
* result-column contracts and nullability facts;
* optional safe-sort insertion metadata; and
* optional-condition source and PostgreSQL coordinate metadata.

Standalone PostgreSQL contract commands additionally emit database-derived
parameter/result representation facts and a driver profile.

## What follows from that

* Removing the pg package does **not** remove named lowering; that belongs to
  the named core.
* Removing a broad runtime hash gate does **not** remove build-time freshness
  or contract source identity.
* Removing safe-sort runtime packaging does not automatically remove its
  analysis output until CLI/output consumers are separately reduced.
* Optional compression cannot be removed or retained by inference from the
  adapter package because its coordinate metadata is its own experimental
  artifact contract.
* `model-gen` has independent result/analysis responsibilities, so this
  evaluation does not authorize model-gen removal.

## Reduction rule

Generated metadata should have one explicit consumer and a source-identity
check at that consumer when it performs a proof-required rewrite. If no
retained consumer remains, both the artifact class and its freshness contract
are removable. This evaluation identifies candidates; it does not migrate or
delete generated artifacts.
