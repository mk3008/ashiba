# List requirements

The application may choose up to three distinct ordering keys in sequence. A
key is selected only from `application/list-ordering.mjs`; callers supply a key
and `asc`/`desc`, never SQL text. The configured tie breaker is always retained.
The SQL remains complete when no ordering key is supplied.
