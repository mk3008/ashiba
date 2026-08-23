# Named parameter treatments

| Treatment | Canonical source | Runtime work | Expected boundary |
| --- | --- | --- | --- |
| N0 | PostgreSQL `$1`, `$2` source | Values in caller order | No named-source readability or reorder protection. |
| N1 | Named SQL | Scan and replace on every execution | Lexer must understand PostgreSQL lexical forms. |
| N2 | Named SQL plus generated artifact | Hash check and `orderedNames.map` | No runtime SQL lexer/replacement. |
| N3 | Current adapter | N2 mechanics plus wrapper services | Existing product baseline. |
| N4 | Native/ecosystem mechanism | Driver/framework-defined | Investigated separately; no invented mechanism. |

N2 is the candidate shape: canonical `query.sql`, generated positional SQL,
ordered names, and source hash. The generated artifact is never the SSOT.
