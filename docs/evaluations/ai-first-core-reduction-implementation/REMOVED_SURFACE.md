# Removed Surface

The following were removed because no capability remained in the Builder Mapper core that required Ashiba to own their workflow:

| Surface | Replacement boundary |
| --- | --- |
| CLI commands and config | Application/repository scripts and ordinary tools |
| Model generation and freshness | Application-controlled direct compilation/cache from visible SQL |
| DDL lint, query uses, PostgreSQL contract | Potential future generic tools; not current Ashiba product |
| SQL-resource snapshot/compare | Git/ordinary review now; derive-now generic comparison remains a separate product question |
| Support Inbox dogfood | Git history; Ticket Queue references cover current core evidence |

No compatibility shell, deprecated alias, no-op package, or generated-state reader was retained.
