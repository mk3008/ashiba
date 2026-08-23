# Application requirements

The canonical SQL files are ordinary PostgreSQL SQL. Do not add Ashiba comments,
directives, or DSL. Generate one artifact entry for every listed workload.

## Binding

Lower only named parameters that occur in executable SQL to PostgreSQL `$n`
placeholders. Preserve their encounter order in `orderedNames`, including
repeated names. Ignore parameter-looking text in string literals, quoted
identifiers, line comments, nested block comments, dollar-quoted bodies, and
escape strings.

## Optional filters (W2 and W4)

Each optional filter has three application states represented by a `*_supplied`
boolean, `*_is_null` boolean, and its value parameter. When `*_supplied` is
false, remove that whole predicate. When supplied with null, replace it with
the artifact's `nullSql`; when supplied with a value, replace it with `valueSql`
and bind `valueNames`. `valueSql` uses `\{\{param:name\}\}` markers, not PostgreSQL
placeholder numbers. The runtime assigns final positional placeholders.

The filters are `assignee`, `customer_id`, and `priority`. Their canonical
predicates intentionally contain repeated control names. Their removal range
must include its leading `and` and leave valid SQL in every combination.

## Sort (W2, W3, and W4)

The application may request a sequence of the finite keys `created_at`, `name`,
and `priority`, each `asc` or `desc`. Insert their expressions at the generated
coordinate before the canonical stable `w.id asc` (or `v.id asc`) tie-breaker.
For `priority`, use exactly `case when ALIAS.priority = 'urgent' then 1 when
ALIAS.priority = 'normal' then 2 else 3 end`, replacing `ALIAS` with the query's visible alias;
never accept arbitrary sort SQL. This explicit expression is the round-2 fix
for an ambiguous pilot packet that had referred to a nonexistent visible CASE.

## Brownfield variants

Regenerate from each complete `brownfield/*.sql` source, never by manually
patching an old coordinate: M1 changes parameter order, M2 adds an optional
predicate, M3 changes comments/formatting, M4 changes CASE ordering/sort target,
and M5 changes CTE/JOIN while retaining optional and sort meaning.
