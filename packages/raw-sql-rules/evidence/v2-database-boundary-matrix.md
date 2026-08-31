# v2 database-boundary matrix

Two fresh independent evaluators read only v2 Rules and the scenario manifest.
Both made the same judgments:

| Scenario | Outcome | Basis |
| --- | --- | --- |
| S19 DDL/static/mock-only result contract | reject | DDL, static types, mocks, and assertions cannot alone establish driver runtime representation. |
| S20 real driver + target engine regression | allow | Representative source SQL is exercised through the native driver. |
| Supplementary boundary: driver result to application DTO mapping | allow | Result mapping is application-owned after the database/driver contract is tested. |
| Supplementary boundary: framework or production DB required | reject | Rule 8 prescribes neither; a disposable local/container database is the preferred test environment. |

No evaluator found an ambiguity, framework mandate, or production-database
mandate. This is source/rubric evidence for the normative Rule, not a claim that
this generic workbench executed a live database.
