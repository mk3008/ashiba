# MySQL / mysql2

Classification: **fit-with-small-gap**.

Live MySQL 8.4.11 / `mysql2` 3.15.3 execution used `connection.execute(sql, values)` directly. Canonical repeated `:status` compiled to `?` for each occurrence and the binder emitted `valueNames: [customerId, status, status]`; this is the native anonymous-placeholder contract, not a defect.

The same native transaction rollback, missing/unused input rejection, stale metadata rejection before native execution, hostile-value control, nullable result, join, ordered read, insert, and update all passed. Default result values were bigint `number`, decimal `string`, datetime `Date`, tinyint boolean `number`, nullable column `null`, update `affectedRows`, and generated id `insertId` as `number`. The bigint result must not be generalized: mysql2 configuration can change it, and applications own that configuration.

Fresh-agent distribution review found no MySQL native starter/reference or testkit path; `ashiba init --db mysql --driver mysql2` intentionally rejects. The existing optional adapter and generated metadata are sufficient for the native baseline. A small documentation/example follow-up may be justified by user evidence; a new parser, mandatory adapter, or generic runtime abstraction is not.
