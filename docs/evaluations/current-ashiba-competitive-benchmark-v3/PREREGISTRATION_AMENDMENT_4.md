# Preregistration amendment 4: resolve v2 pre-scoring controls

## Status at correction

This correction is made before candidate scoring. Primary scored-cell count is
**0**. It does not replace the initial preregistration or amendments 1–3.

## Resolved P0 controls

Protocol v2 now has a reference control and seven runner-owned negative
controls recorded with Node 24.18.0 against PostgreSQL 18.6. The reference
passes the complete G1/T1/T2/Q1 contract, including the expanded finite sort,
pagination, get validation, transaction, concurrency, and Q1 SQL/EXPLAIN
checks. The negative controls reject wrong schema, wrong result, hostile-value
misuse, invalid sort acceptance, partial transaction, duplicate claim, and
fabricated stdout/missing API evidence.

The runner inspects the complete candidate package root instead of only a
source subdirectory. It rejects symlinks and workspace/file/link dependency
leakage, records a textual source manifest, records runner-owned final database
state before cleanup, and fails a live record if fixture cleanup fails.

The evidence executor is a non-scoring controller that preserves candidate
snapshots, command logs, first-pass slots, prompt/packet hashes, runner output,
treatment review, final database summary, and a SHA-256 evidence manifest
before external cleanup. It does not edit a candidate or decide treatment
fidelity.

## Freeze rule

The first commit containing this amendment and the passing v2 packet verifier
is the protocol v2 `executionPacketFreezeSha`. No candidate may be dispatched
until an independent audit confirms that this frozen packet and the control
evidence satisfy the preregistered protocol. A later runner or packet change is
a protocol correction, not a candidate repair.

## Remaining disclosed limits

Candidates receive separate directories and nonce-scoped database roles, but
this Windows host does not provide a separate operating-system user or network
namespace for each delegated agent. That limitation is disclosed in reports and
is not treated as proof of stronger isolation than is actually enforced.
