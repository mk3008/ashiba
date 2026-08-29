# Evaluation fixtures

These files are isolated inputs for the Architecture Fitness evaluation. They
are not a product example or a recommended application layout.

`read-current.sql` is Task A's normal-form read query. It has a join, four
named runtime values, two nullable guards, four result columns, and pagination.
`read-changed.sql` is Task B's realistic change: a third nullable filter and a
new result column. The paired DDL snapshots model Task E's additive schema
change. The write files are a two-statement native transaction shape used by
Task D; the Ticket Queue reference supplies the live rollback control.
