# Migrating from the removed ZTD testkit

Ashiba no longer owns a SQL logic-test framework, fixture grammar, or PostgreSQL
testkit wrapper. Keep canonical SQL visible and move semantic proof to ordinary
application-owned PostgreSQL, integration, or live tests.

| Former ZTD proof | Replacement | Proof retained? |
| --- | --- | --- |
| Seeded query execution through fixture rewriting | Application-owned PostgreSQL setup and native application query path | Yes |
| Joined ticket details and message ordering | Support Inbox physical PostgreSQL route/integration test | Yes |
| Left join for a ticket without messages | Support Inbox physical PostgreSQL route/integration test | Yes |
| Synthetic fixture grammar and generated manifests | No replacement; these were Ashiba-owned test mechanics | Not a semantic proof |

Use application setup, execute the native/application path, assert observable
rows or HTTP behavior, then clean up or roll back. Keep transaction policy and
fixture data application-owned. `ashiba postgres-contract` remains available
for optional PostgreSQL-derived parameter/result representation proof; it is not
a SQL logic-test framework.

## Representative migration measurement

| Observation | Result |
| --- | --- |
| Selected test | Support Inbox `get-ticket-detail` ZTD cases |
| Replacement | Existing physical PostgreSQL route/integration suite, extended with message order and left-join assertions |
| Wall time | 12 minutes for the representative package/fixture/config migration unit, excluding repository-wide verification |
| Model token usage | unavailable |
| Retries | 0 during the representative migration unit |
| Proof lost | none identified: SQL execution, parameter binding, ordering, and left-join behavior remain covered |
