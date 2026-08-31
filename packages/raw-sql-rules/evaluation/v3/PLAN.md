# V3 review-response plan

V3 preserves all prior evidence and tests four review questions: goal-driven
implementation behavior, a native named-parameter live lane, normal CI
connection, and permanent contract wording. It does not compare ORMs or
implement a PostgreSQL adapter.

## Method

Fresh implementation agents receive only `RULES.md`, a stated fixture context,
and an implementation goal. They do not receive an expected judgment. Their
created candidate directories are the durable actual diffs. Separate fresh,
read-only reviewers inspect those files. A MySQL 8.4 disposable container and
mysql2 `namedPlaceholders: true` provide one live driver lane.

## Decision criteria

READY requires every important observed boundary to be respected by
goal-driven candidates, a successful native-driver live lane, no framework or
Ashiba coupling, and package checks in normal CI. Repeated candidate failure to
add the real-database coverage Rule 8 requires NOT-YET unless classified as a
fixture defect with contrary deciding evidence.
