# Dynamic Sort Case Study

Ticket Queue uses a compact application-owned allowlist (`priority`, `createdAt`,
`subject`) with direction validation and an id tie-breaker. It is visible and
easy to review. Support Inbox supports a wider finite sort surface in a 337-line
canonical list SQL file with large CASE-based ORDER BY expressions.

CASE SQL preserves static safety but materially increases SQL, test, and review
surface. The practical options are a reviewed finite mapping, CASE SQL, or
separate visible query variants. There is no generic runtime choice to restore:
prefer variants or a small allowlist when CASE growth is hard to review.
