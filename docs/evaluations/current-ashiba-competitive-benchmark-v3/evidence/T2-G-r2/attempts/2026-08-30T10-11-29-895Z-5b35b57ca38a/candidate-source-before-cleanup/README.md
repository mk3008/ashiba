# T2 native pg candidate

`claim` validates that `workerId` is a non-empty string. It binds the value as
`$1` and uses no dynamic SQL identifiers or finite SQL mapping for this
workload. A single `UPDATE` statement selects one queued row with
`FOR UPDATE SKIP LOCKED`, so concurrently started workers cannot claim the
same work item. PostgreSQL rolls back the entire statement if the database
trigger rejects the update.
