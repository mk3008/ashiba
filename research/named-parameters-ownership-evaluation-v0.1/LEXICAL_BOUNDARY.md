# Lexical boundary

The scanner passes unknown grammar through unchanged and lowers only normal-context markers. It protects strings, double-quoted identifiers, line comments, nested block comments, PostgreSQL casts, dollar quotes, and PostgreSQL escape strings. This is lexical, not semantic SQL understanding.

MySQL backticks and `#` comments, SQL Server/SQLite bracket identifiers, and Oracle alternative quoting are not protected today. Each is bounded scanner-profile work, not parser pressure. A retained core should fail closed for a selected profile when it cannot distinguish markers, and should not reject unfamiliar SQL grammar.
