# MySQL 8.4 / mysql2

Classification: **`not-worth-owning`**.

MySQL's prepared-statement protocol can provide parameter and SELECT result field metadata without executing the statement. The live INSERT prepare left zero rows. However, mysql2's public promise `prepare()` result did not expose those fields. They were visible only through `connection.connection.prepare`, a private driver-internal path.

Using that internal shape would make Ashiba responsible for mysql2 internals, protocol field interpretation, and configuration-sensitive driver mappings. Safe live SELECT probes are weaker and cannot establish DML safety. Existing generated binding metadata still fail-closes missing/extra/stale names, but public mysql2 prepare metadata is insufficient for a database-derived manual TypeScript parameter/result verifier. No MySQL Verify lane is recommended.
