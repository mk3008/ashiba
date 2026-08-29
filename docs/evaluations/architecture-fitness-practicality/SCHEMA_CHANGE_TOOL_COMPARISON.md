# Schema Change Tool Comparison

The fixture adds nullable `resolved_at` to `public.tickets`. Query uses against
Support Inbox found four high-confidence table references across seven catalogs;
unqualified column evidence can be low confidence. DDL lint rejected
`t.missing_column` before execution.

Migration generation produced `ALTER TABLE "tickets" ADD COLUMN "resolved_at"
timestamptz NULL;` for this additive fixture. Its JSON summary is `add_column`
and `hasChanges` is true. It did **not** generate DROP/CREATE SQL.

The same JSON separately represents the changed normalized table definition in
`applyPlan` as `drop_table_cascade`, `recreate_table`, and `create_table`. Its
`destructiveRisks` contains `semantic_constraint_change` for `public.tickets`;
its `operationalRisks` is empty. The plan and risk are not the generated SQL and
must not be reported as such. This creates a review-metadata consistency concern
and a possible double-authority problem, not a generated-SQL correctness claim.
Migration generation remains useful deterministic review evidence, never a
migration application path. PostgreSQL contract is stronger DB-derived proof
where opted in. SQL-resource live tests deterministically classified schema
mutations, but have no current application/CI consumer.
