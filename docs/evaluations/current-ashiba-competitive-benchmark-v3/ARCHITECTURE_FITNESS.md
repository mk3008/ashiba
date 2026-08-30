# Architecture fitness

## Definition

Architecture fitness means the required movement of an existing application
architecture to adopt a treatment. It does not mean that fewer files or fewer
features are automatically better.

## Controls

AF-V starts from a frozen vertical-slice baseline and AF-L from a frozen
layered baseline. Both preserve supplied `pg` pool, transaction seam, DTO,
and tests and require the frozen G1 API. The runner records candidate/baseline
hash deltas and reuses the primary G1 PostgreSQL oracle read-only.

## Evidence status

The result index has durable AF-V and AF-L **replicate 1** observations, plus
heterogeneously preserved AF replicate-two records. The aggregate retains the
reliable AF paths as `supplementalObservations`, and records exact paths and
hashes rather than coercing them into primary repair fields. AF-V also
preserves invalidated/pre-correction runner records in accordance with the
correction ledger. These controls are observation-only and are not included in
the primary matrix or an aggregate. Readers must inspect each stored runner
output and baseline delta before asserting architecture conclusions.

## Bounded inference

The protocol can establish that a candidate satisfied the frozen behavior
while retaining or altering listed baseline surfaces. It cannot establish that
one architecture is generally better, that a treatment mandates an
architecture outside this fixture, or that an observed generated/configured
surface is intrinsically harmful.
