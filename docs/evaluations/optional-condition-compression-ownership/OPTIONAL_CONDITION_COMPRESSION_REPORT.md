# Optional-Condition Compression Durable Productization Report

## Decision question

Should Ashiba permanently own PostgreSQL optional-condition compression as an
optional product capability after ordinary PostgreSQL preparation and safe-sort
runtime ownership were reduced?

The evaluation begins from main at
`4c7caf53e6e690b581d5d2a8193a553d7c84d50a`. It changes no product code,
public API, package topology, generated format, or current product docs.

## Final decision

**`REMOVE` optional-condition compression from Ashiba product ownership.**

The capability has one real, narrow deterministic value: it rejects stale
coordinate metadata before rewriting SQL and before native PostgreSQL
execution. That is an early freshness proof, not semantic, transaction, plan,
or performance proof.

The current evidence does not show that this early proof prevents enough
additional runtime failures, repair cost, or review mistakes to justify a
permanent runtime rewriter, coordinate schema, generated artifact refresh
contract, CLI authoring/refresh surface, public API, PostgreSQL-specific
compatibility, and package residue.

## Product boundary after the decision

The ordinary replacement is deliberately simple:

```text
canonical SQL with nullable guards or application-owned visible variants
-> deterministic named binding metadata
-> bindNamedParameters
-> application-owned native driver
-> application/integration/live tests
```

Optional-input meaning and business semantics remain application-owned. The
decision does not remove canonical SQL, named binding, `model-gen`, native pg,
or the standalone PostgreSQL contract.

## Why the unique proof is insufficient

The Dynamic Mechanism Value Ablation established that coordinate compression
rejected all five stale source/coordinate mutations before PostgreSQL and was
the first detector in two of four fresh repair trials. It also established:

* ordinary retained nullable guards reached green through ordinary tests in
  four of four repairs;
* application tests ultimately found every O-A/O-B migration inconsistency;
* no independently measured reduction in runtime failures, retries, repair
  breadth, or false repairs was demonstrated;
* the only O-C false positive was caused by the evaluator's stale requirement;
  and
* O-C had 32.1x O-A artifact bytes and six times the files at 100 queries.

Early detection is useful, but the evidence supports a local optional
accelerator, not a permanent Ashiba product surface.

## Current consumer result

Support Inbox is the only current Ashiba product/dogfood consumer. It has four
query-source opt-ins, but only the list-query family demonstrates the
multi-branch optional-filter shape that compression materially changes. Two
same-named customer-option sources and get-ticket-detail also carry opt-in
metadata; an opt-in flag is not evidence that every source needs a runtime
rewrite. Transfer has one opt-in source but is a detached experimental product.

Current generated query metadata containing an optional-condition field is
evidence of historical/current implementation coupling, not a reason to retain
the capability. See `CONSUMER_CENSUS.md`.

## Scope and Golden Path

Scope change required: **no**. Golden Path changed: **no**.

The checked-in main currently has no `docs/design/ashiba-scope.md` despite
legacy guide links to it. This is a documentation limitation, not evidence to
extend product scope or block a removal recommendation. The inherited product
direction—optional input meaning is application-owned and subtraction was
default-off—is compatible with removal.

## Evidence strength and limitations

Evidence strength is **medium**. It combines current source/consumer evidence,
focused current tests, Phase 2 live verification, and the prior controlled
ablation. It does not include an external consumer census, a production
incident history, or a new multi-application adoption study. Those omissions
do not turn the early proof into durable value; they limit claims about exact
future migration cost.

Read `OPTIONAL_CONDITION_COMPRESSION_DECISION.md` for the implementation
boundary and reconsideration trigger.
