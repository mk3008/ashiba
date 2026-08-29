# Schema Change Tool Comparison

The fixture adds nullable `resolved_at` to `public.tickets`. Query uses against
Support Inbox found four high-confidence table references across seven catalogs;
unqualified column evidence can be low confidence. DDL lint rejected
`t.missing_column` before execution.

Migration generation made deterministic review output but rendered recreate/drop
risk for this additive fixture. It is therefore review evidence, never a
migration application path. PostgreSQL contract is stronger DB-derived proof
where opted in. SQL-resource live tests deterministically classified schema
mutations, but have no current application/CI consumer.
