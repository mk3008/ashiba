# Candidate validation and SQL mapping

`investigate` and `explain` accept only object inputs whose `requestedTag`
and `tier` properties are strings. Other runtime values reject with the
application-owned `VALIDATION` error before a query is sent.

The two input strings are bound as PostgreSQL parameters `$1` and `$2`; they
never select SQL syntax. `sourceSql` is the reviewed query template. Its sole
`{{schema}}` deployment token is replaced for execution with the supplied
unquoted `runtime.schema` identifier. The application accepts only PostgreSQL
unquoted-identifier grammar for that deployment value. This makes the task
tables and enum type refer to the runtime-provided nonce schema without
treating an operation input as SQL.

No operation-controlled SQL mappings are used for this workload.
