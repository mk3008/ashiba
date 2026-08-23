# Multi-column ordering requirements

The application allows at most three unique keys in caller-supplied sequence:
`createdAt`, `name`, and `priority`; direction is `asc` or `desc`. `priority`
means `CASE WHEN priority = 'urgent' THEN 1 WHEN priority = 'normal' THEN 2
ELSE 3 END`. `id ASC` is always appended as a stable tie-breaker. Unknown keys,
raw syntax, invalid directions, duplicate keys, and more than three keys reject
before SQL execution.

S1 is an application whitelist dictionary with bounded composition. S2 is the
current Safe Sort mechanism. S3 selects complete SQL assets only for a
single-sort baseline; it is not claimed suitable for arbitrary multi-sort grid
sequences.
