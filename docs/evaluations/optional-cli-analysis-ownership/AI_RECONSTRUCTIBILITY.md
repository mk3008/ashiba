# AI Reconstructibility Assessment

This assessment does not claim that AI is automatically safe. It distinguishes
one-off interpretation from a maintained, deterministic contract.

| Capability | AI/native-tool reconstruction | What reconstruction does not retain | Verdict |
| --- | --- | --- | --- |
| Formatter | High: editor or common SQL formatter can make a proposed diff | Ashiba's exact comment/AST guarded-write behavior | The extra guard is not tied to the Golden Path and is too narrow to justify a permanent workflow |
| Query lint | High: AI can inspect CTEs, joins, templating, and size; a project can use a local policy script | A uniform advisory vocabulary | Convenience only |
| Uses | Medium: AI/grep can enumerate candidates | AST coverage, normalized catalog traversal, confidence/fallback data, and default failure on parse gaps | Retained mechanical value |
| Outline / graph | High: AI or general AST tooling can explain a single query | Stable presentation formatting only | Convenience only |
| Slice | High: AI/DB tooling can construct a debug query | Nothing verifies that the result is correct to execute | Convenience only |
| DDL-aware lint | Medium: AI can inspect references, but reliable repository-wide cross-checking requires parsing/DDL model logic | Reproducible early static mismatch detection | Retain only demonstrated narrow guards |

AI-assisted maintenance lowers the value of persistent explanatory interfaces,
but it does not eliminate fail-closed deterministic analysis. The retained
`query uses` boundary is justified by the latter: it reports where analysis
was AST-backed, where it fell back, and refuses a purportedly complete result
on parse failure unless the caller explicitly accepts fallback.

No fresh independent-agent speed or token benchmark was conducted. This is
intentional: the decision rests on current deterministic behavior and
maintenance ownership, not a claim that AI is faster at a particular edit.
