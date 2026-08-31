# V4 shared fixture

The target is a disposable local MySQL 8.4 database. The available native
driver is mysql2 3.22.3, configured with `namedPlaceholders: true`. Connect to
`127.0.0.1:33306`, database/user/password `raw_sql_rules` while the local
container is running. The fixture has only `work_items` from `schema.sql`.

Candidates own their application code, SQL assets, and tests under their own
`candidate/` directory. They must not modify this shared fixture.
