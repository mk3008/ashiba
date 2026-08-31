# v1 affected-scenario regression

A fresh, read-only evaluator received only `RULES.md` v1 and the scenario
manifest. It judged S07 **allow**, S12 **reject**, S13 **clarify**, S17
**allow**, and S18 **clarify**. It also found no permission for arbitrary
fragment building or a framework escape.

`clarify` is intentional for S13 and S18: the Rules provide the decision test,
but the task card omits the factual context needed to apply it. This is not a
Rule defect. No further amendment was warranted.

Limit: source/rubric regression only; no live database execution.
