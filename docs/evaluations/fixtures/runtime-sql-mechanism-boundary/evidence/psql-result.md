# psql canonical-source check

After fixture calibration, PostgreSQL 18 `psql` executed `canonical.sql` with
client variables `id=1`, `id2=2`, and `value='x'`. The resulting row preserved
the colon-bearing string, quoted identifier alias, line/block comments, nested
comment, escape string, and dollar-quoted bodies. This proves the canonical
asset is directly investigable in a SQL client for this case; it does not make
psql interpolation the application runtime binding mechanism.
