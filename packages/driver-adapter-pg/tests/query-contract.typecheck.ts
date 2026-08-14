import type {
  AshibaPostgresAdapter,
  AshibaPostgresQuerySource,
  NodePostgresQueryable,
} from '../src/index.js';
import { createPostgresAdapter } from '../src/index.js';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false;
type Assert<Value extends true> = Value;

interface Params {
  userId: number;
}

interface Row {
  user_id: number;
}

declare const adapter: AshibaPostgresAdapter;
declare const source: AshibaPostgresQuerySource<Params, Row>;
declare const client: NodePostgresQueryable;

const result = adapter.execute(source, { userId: 1 });
type _AdapterUsesSourceRow = Assert<Equal<Awaited<typeof result>['rows'], Row[]>>;

// @ts-expect-error Parameter types come from the source.
adapter.execute(source, { userId: '1' });

// @ts-expect-error A caller cannot select an unrelated result generic.
adapter.execute<{ forged: true }>(source, { userId: 1 });

createPostgresAdapter(client, { driverProfile: 'node-postgres-default' });
createPostgresAdapter(client, { driverProfile: 'custom:application-v1' });
// @ts-expect-error Custom parser profiles require the explicit custom:<id> namespace.
createPostgresAdapter(client, { driverProfile: 'application-v1' });

void result;
