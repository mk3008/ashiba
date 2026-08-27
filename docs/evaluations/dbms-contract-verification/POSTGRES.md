# PostgreSQL Control

Classification: **`native-contract-natural-fit`**.

The existing standalone command prepares lowered `$n` SQL inside a transaction, reads `pg_prepared_statements` and catalogs, then rolls back. It does not run the application statement. The live control derived `bigint`, `text`, `numeric`, and `boolean` facts; the driver profile mapped bigint/numeric results to `string` and boolean to `boolean`.

The existing checker passed matching manual TypeScript shapes and rejected a wrong parameter type, extra parameter, wrong/missing/extra result fields, and stale SQL. The described INSERT left zero rows. Nullability was `unknown` in this isolated SQL because no supporting offline DDL contract was passed; the verifier did not invent a nullability claim.
