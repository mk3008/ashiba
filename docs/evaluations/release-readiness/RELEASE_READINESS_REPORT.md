# Ashiba release readiness / AI-first adoption finalization

## Decision

**READY-WITH-CONCERNS** pending the new Node 22/24 npm-distribution CI matrix.
The locally available Node 22/npm 10 proof and the independent application
oracles pass. Node 24/npm 11 is a formal CI lane because this workstation has
no Node 24 runtime; do not upgrade the decision to `READY` until that lane is
green.

## Current boundary

Ashiba is a Builder Mapper core, not an ORM, architecture framework, migration
platform, driver runtime, or agent runtime:

```
canonical raw SQL
→ deterministic binding metadata / freshness
→ bindNamedParameters
→ application-owned finite reviewed SQL composition
→ native driver
→ application/live tests
```

The application owns pools, transactions, rollback, logging, mapping,
migrations, schema pull, deployment, and business policy. Optional proofs do
not become a required Golden Path gate.

## Evidence summary

- Current docs and Scope were cleared of removed current surfaces; historical
  evaluations remain archive evidence.
- Node support is Node 22 and 24 LTS, with Node 24 recommended. Public package
  engines now express that policy.
- The minimal, VSA, and layered references are independently reviewable and
  carry exact prompt/provenance material.
- Fresh-agent VSA and layered clean rooms passed a runner-owned PostgreSQL
  oracle, not their own test claims alone. The oracle covers filters, reviewed
  sort, pagination, get, committed assignment, and injected-audit rollback.
- The npm tarball proof uses only packed public packages and normal npm install.

## Concern and follow-up

The publish-shaped tarball proof must materialize pnpm's workspace-protocol
rewrite. It verifies the released manifest shape, but it is not a hosted
registry installation. CI is the compatibility authority for Node 22 and 24.
No runtime abstraction or product capability is proposed as a remedy.

## Invariants

Scope: unchanged. Golden Path: unchanged. DBMS positioning: unchanged.
Product runtime behavior: unchanged except that successful CLI `model-gen`
output is concise and stale artifacts are actionable.

See [raw results](raw-results.json), [support matrix](SUPPORT_MATRIX.md),
[clean-room evidence](CLEAN_ROOM_DOGFOODING.md), and
[architecture references](ARCHITECTURE_REFERENCE_REPORT.md).
