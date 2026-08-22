# Candidate contract under evaluation

1. Keep executable queries as complete, independently reviewable SQL assets.
2. Represent runtime values by named parameters in the asset.
3. Do not add SQL fragments from runtime input.
4. Permit only application-defined, finite, reviewed ordering semantics; select
   a complete asset rather than construct syntax.
5. Keep query purpose and change scope local.
6. Make named-to-positional lowering mechanical and inspectable.
7. Keep pool, transaction, locking, and business policy visible to the
   application.

This is a candidate model. It does not require any named Ashiba mechanism and
does not conclude that any existing product mechanism is removable.
