# Initial candidate minimum Ashiba rules

These are an experimental candidate, not a product decision. They deliberately name no current mechanism.

1. Keep each executable query as a complete, independently reviewable SQL source asset.
2. Represent runtime data as named parameters in that source asset.
3. Do not create SQL syntax from open-ended runtime input.
4. Any runtime-selected SQL syntax must be selected from a finite, reviewed set whose members are visible to review.
5. Keep a query's purpose and changes local unless shared behavior is intentionally the same contract.
6. Preserve a mechanical, inspectable mapping from named SQL parameters to the driver’s positional values when the driver requires positional binding.
7. Keep application policy and connection/transaction ownership explicit; neither may be hidden by query construction.

## Why these seven

The inventory distinguishes the observed invariants—visible canonical SQL, parameter/value separation, bounded syntax selection, local reviewability, and inspectable execution lowering—from the current names and APIs that implement them. Optional-condition removal is omitted because it is a technique for retaining a complete canonical SQL statement, not an invariant required by every query. A fixed `ORDER BY` exception is also omitted: finite runtime selection is the more general candidate rule.

The explicit named-parameter rule is retained even if a fresh agent can use a positional driver correctly. It is a proposed Ashiba contract for source-level input meaning, not merely a tutoring device.
