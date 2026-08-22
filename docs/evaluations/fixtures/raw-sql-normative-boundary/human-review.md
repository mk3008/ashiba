# Human reviewability record

Review performed against the final, evaluator-v6 candidate artifacts. This is a source-review record, not an assertion that static inspection proves security.

| Candidate | Canonical SQL explains purpose | Runtime-added syntax | Named inputs reveal meaning | SQL-client investigation path | Local change target | Unrelated-query reading required | Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| G0-r5 | yes: separate search/list/open/owned/binding assets | finite reviewed selection only | yes for W1/W3/W4 | named source plus mechanical lowering | query-specific constants | no | acceptable |
| G0-r6 | yes: separate source assets and finite selector | finite reviewed selection only | yes where values exist | named source plus mechanical lowering | query-specific constants | no | acceptable |
| G1-r5 | yes: W2 finite complete-SQL manifest and separate W3 assets | finite asset selection only | yes for W1/W3/W4 | named source plus positional form | query-specific constants | no | acceptable |
| G1-r6 | yes: W2 CASE source and separate W3 assets | none; values bind into CASE | yes for W1/W2/W3/W4 | named source plus positional form | query-specific constants | no | acceptable |
| G2-r3 | yes: complete finite sort manifest and isolated queries | finite reviewed asset selection only | yes for W1/W3/W4 | named source plus lexical lowerer | query-specific constants | no | acceptable |
| G2-r4 | yes: complete finite sort manifest and isolated queries | finite reviewed asset selection only | yes for W1/W3/W4 | named source plus positional form | query-specific constants | no | acceptable |

The parameterless `openItems` assets intentionally contain no named parameter: requiring a synthetic parameter would obscure, rather than expose, input meaning. This distinction is registered in the adaptive decision log.
