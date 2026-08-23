---
title: SQL Guidelines
---

# SQL Guidelines

These are non-normative writing and review suggestions. Product boundaries and
runtime responsibilities are defined only in [Ashiba Scope](../design/ashiba-scope.md).

- Put the purpose and important business reason near a complex CTE or primary
  `SELECT`, so intent stays local to the SQL a reviewer investigates.
- Explain semantic constants where their meaning is not evident; for example,
  `status = 2 -- successful completion` is often clearer than a distant note.
- Prefer formatting that makes joins, predicates, ordering, and pagination easy
  to inspect in a SQL client.
- Keep complex query intent close to the query instead of requiring readers to
  reconstruct it from an application layer.
- Preserve ordinary database SQL where possible so existing or external SQL can
  be reviewed and diagnosed with familiar tooling.

These suggestions do not require a file layout, metadata format, command, or
special SQL annotation.
