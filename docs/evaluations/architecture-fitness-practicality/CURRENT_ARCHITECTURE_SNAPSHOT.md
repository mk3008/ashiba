# Current Architecture Snapshot

The normal execution path is canonical `.sql` -> generated binding metadata ->
`bindNamedParameters` -> native selected driver. Values are never interpolated
into SQL text. Support Inbox owns logging, masking, mapping, cardinality, and
transaction selection around native pg. Ticket Queue owns a direct pg
transaction for assignment/audit and rolls it back on the negative case.

No driver adapter, executor, transaction helper, or runtime SQL parser is
required by the current application boundary.
