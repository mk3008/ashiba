# DDL Docs Ownership Decision

## Decision

**REHOME-TO-TRANSFER**

## Reason

- Current production use is Transfer-only.
- The useful deterministic checks have real failure-prevention value, but check
  Transfer DDL, metadata, ordering, Concept/DFD/Process relationships, and
  Transfer policy documents.
- The full Transfer workflow ran from a throwaway local copy without the
  monorepo package boundary and produced equivalent generated output.
- Private package separation provides no publication or external-contract
  value, while it adds package/bin/version/docs/example/compatibility and root
  docs-build responsibilities.
- Ashiba's current product boundary does not own application architecture,
  authority, testing, technology, or review-plan policy systems.

## Compatibility implication

There is no external package compatibility obligation. A future implementation
should move the retained Transfer behavior with an explicit local invocation;
it should not leave a deprecated package shim.

## Evidence strength and uncertainty

Evidence is strong for the current ownership location: full local-copy
generation, metadata checking, drift verification, and review-plan output
worked. It is not a reduction design: the experiment did not decide the exact
minimal Transfer subset or move code on this branch.

## Reconsideration trigger

Reconsider Ashiba product ownership only when multiple independent non-Transfer
products require the same small DDL metadata invariant, or when an independently
valuable deterministic guard with a stable cross-product contract is
demonstrated. Generic documentation convenience is not a trigger.
