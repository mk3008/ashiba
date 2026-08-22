# Proposed Minimum Ashiba contract after the audit

Status: **post-experiment design proposal**. This is not the preregistered G1 treatment. The historical seven-rule treatment remains unchanged in [`initial-candidate-rules.md`](./initial-candidate-rules.md).

The audit showed that named Safe Sort and SSSQL guidance was not necessary for the registered outcomes once the common task specification had already fixed the relevant application semantics and safety boundaries. That observation does not by itself justify a broad rule allowing any finite runtime SQL syntax. The proposal below therefore separates raw-SQL invariants, application-supplied semantics, and runtime mechanics.

## Raw SQL normative rules

1. Keep each executable query as a complete, independently reviewable SQL source asset. The asset may be a file or an exported string; the rule does not require filesystem access.
2. Represent runtime data as named parameters in that source asset.
3. Do not construct or add SQL fragments, clauses, identifiers, predicates, projections, joins, grouping, or arbitrary expressions from runtime input.
4. Runtime ordering is an explicit exception only when the application requirement defines a finite reviewed set of ordering semantics. Runtime input may select one of those semantics, but may not become SQL syntax. Selecting among multiple complete reviewed SQL assets is also allowed and is not treated as fragment addition.
5. Keep a query's purpose and changes local unless shared behavior is intentionally the same contract. Duplication is acceptable when sharing would hide intent or widen the change surface.
6. Optional filtering must remain expressible as complete SQL semantics. Runtime predicate addition is not required. Subtractive removal of provably unnecessary parts is an allowed optimization technique, not a source-level requirement.

## Application semantics that must be supplied when relevant

These are requirements/context, not facts an agent can infer uniquely from Ashiba rules.

- Optional input semantics must define the meaning of omitted/not-supplied, explicit `NULL`, and concrete values when those states are distinguishable. The scored W1 workload evaluated only `NULL` and present-value combinations; it did not evaluate omitted-vs-NULL three-state semantics.
- Sort capability must define which ordering keys, directions, tie-breakers, and any special ordering expressions are supported. The scored W2 workload fixed only `title | priority` and `asc | desc`; it did not establish a universal sort capability model.

## Runtime contract

1. When the database driver requires positional parameters, named-to-positional lowering must be mechanical and inspectable, including repeated names, casts, quoted strings, and comments.
2. Connection, pool, transaction, retry, and business-policy ownership remains explicit and application-owned unless a separate product responsibility is independently justified.

## Interpretation of existing mechanism names

- **Safe Sort**: optional pattern/tooling for implementing the finite ordering exception; not required vocabulary for the tested outcome.
- **SSSQL**: optional pattern/tooling for optional-condition representation/removal; not required vocabulary for the tested NULL/value outcome. Its omitted/NULL/value semantics, if adopted, are a separate application/API contract and were not evaluated here.
- **Thin driver**: not required for the registered named-lowering responsibility. Other current adapter responsibilities require separate evidence before removal or retention decisions.

This proposal deliberately does not generalize W2 into a rule that any finite runtime-selected SQL fragment is allowed. That broader rule was part of the initial candidate treatment, but the experiment only exercised finite runtime ordering.
