# Experiment Design and Reproduction

The live harness is [evaluation/run-live.mjs](evaluation/run-live.mjs), with [docker-compose.yml](evaluation/docker-compose.yml). It creates the same logical `np_orders` fixture in PostgreSQL 18, MySQL 8.4, and SQL Server 2022. Values are deliberately distinct strings so a same-type swap returns the wrong empty result rather than accidentally passing.

Task SQL has four logical names and repeats `actor_id`:

```sql
select shop_id, status, customer_id from np_orders
where shop_id = :shop_id and status = :status
  and (created_by = :actor_id or updated_by = :actor_id)
  and customer_id = :customer_id
order by shop_id
```

Arms: current Ashiba compilation/binding for all drivers; pg direct `$n`; mysql2 driver named and direct anonymous; mssql direct named request/input. Negative controls: same-type swap, missing/extra values, repeated occurrence, semantic cross-wire, and current binder missing/unused.

Reproduce after dependencies are installed:

```sh
docker compose -f docs/evaluations/named-parameter-ownership/evaluation/docker-compose.yml up -d
node docs/evaluations/named-parameter-ownership/evaluation/run-live.mjs
```

The run used Node `v22.14.0`; selected package versions were `pg 8.21.0`, `mysql2 3.22.3`, and `mssql 11.0.1`. Evaluation ports were 55434, 53306, and 51433 because unrelated local services occupied the usual PostgreSQL port. No credentials are committed beyond throwaway local container credentials.

AI editing: no fresh independent agent or token telemetry was available in this environment. The evaluation therefore does not claim an AI benchmark. [Editing results](EDITING_RESULTS.md) records the exact mechanical edits and representative diffs a reviewer would inspect.
