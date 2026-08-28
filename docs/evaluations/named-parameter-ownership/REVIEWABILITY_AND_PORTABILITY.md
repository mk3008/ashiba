# Reviewability and Investigation Portability

| Style | Review signal | Scratch/client portability | Limitation |
| --- | --- | --- | --- |
| Ashiba canonical `:name` | names are adjacent to SQL sites; generated binding supplies driver form | requires lowering before ordinary DB client execution | client does not necessarily accept canonical syntax |
| pg `$n` | valid PostgreSQL client syntax | directly runnable in `psql` with ordered values | identity is external to placeholder; comment is non-normative |
| mysql2 named `:name` | names adjacent to SQL sites | runnable through configured mysql2, not necessarily generic mysql client | feature is driver-owned lowering |
| mysql2 `?` | directly familiar MySQL prepared syntax | requires ordered occurrence array | weakest identity/repeated-value review signal |
| mssql `@name` | names adjacent to sites | native SQL Server/request model | registration must still match SQL |

The current canonical format is not automatically better for every scratch client; it is better at retaining one semantic identity in source before selected-driver lowering. A normal comment can help positional review but must not become a parser, freshness contract, or DSL. Investigation portability is useful but is not the deciding retention reason.
