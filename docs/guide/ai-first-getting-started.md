# Get started with Ashiba and an AI coding agent

Use Ashiba after your tables and DDL design are already decided. It is not an
ORM or an application architecture framework: you keep visible SQL, call your
native driver, and own pooling, transactions, logging, mapping, migrations, and
business tests.

Ashiba supports Node.js 22 and 24 LTS. Node 24 is recommended.

## Install

```bash
npm install pg @ashiba-ts/named-parameters
npm install -D @ashiba-ts/cli typescript
```

## Give the agent one small invariant file

Copy the [consumer AGENTS.md sample](./consumer-agents.md) into your project.
Then give your agent a short goal such as: “Implement ticket assignment using
Ashiba according to AGENTS.md. The DDL is already the contract.” The agent can
discover supported commands instead of guessing them:

```bash
npx ashiba describe command --format json
```

## The happy path

1. Keep canonical SQL in a visible `.sql` file with meaningful named parameters.
2. Let the agent generate a checked-in binding artifact after changing SQL.
3. Make the freshness check part of the application verification path.
4. Bind names to values and call the native driver directly.
5. Prove behavior with application and live tests.

```bash
npx ashiba model-gen src/tickets/list.sql --out src/tickets/list.bindings.ts
npx ashiba model-gen src/tickets/list.sql --out src/tickets/list.bindings.ts --check
```

```ts
import { bindNamedParameters } from '@ashiba-ts/named-parameters';
import { bindingMetadata } from './tickets/list.bindings.js';

const prepared = bindingMetadata.bindings.postgres;
const { sql, values } = bindNamedParameters(prepared, { status, limit });
const result = await pool.query(sql, values);
```

For optional filters, choose visible SQL variants or pass nullable values where
your SQL explicitly handles them. In PostgreSQL, cast a nullable parameter in a
null guard when its type would otherwise be ambiguous, such as
`cast(:status as text) is null`. For dynamic order clauses, map validated
public keys to a closed, reviewed set of source-controlled SQL literals. Never
put raw external input into SQL syntax.

## A useful failure

When SQL changes but its artifact has not been regenerated,
`model-gen --check` fails before a release. Ask the agent to regenerate the
artifact, review the generated diff, and run the check again. When a caller
omits a named value or supplies an unused one, `bindNamedParameters` fails
before it calls the database. These are mechanical boundaries; application/live
tests still prove business behavior and transaction outcomes.

## Choose your architecture

Ashiba works with a small module, vertical slices, or a layered application.
See the [architecture references](./architecture-references.md) for the same
ticket task arranged in each shape. CLI details are in the [command API](../generated/api/commands.md).
