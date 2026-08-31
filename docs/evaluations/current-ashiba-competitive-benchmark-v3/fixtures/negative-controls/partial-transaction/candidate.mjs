import pg from 'pg';
import { quoteSchema } from '../../fixture.mjs';

const { Client } = pg;

function closedError() {
  const error = new Error('application is closed');
  error.code = 'APPLICATION_CLOSED';
  return error;
}

export function createApplication(runtime) {
  let closed = false;
  const schema = quoteSchema(runtime.schema);
  return {
    async transfer(input) {
      if (closed) throw closedError();
      const client = new Client({ connectionString: runtime.connectionString });
      await client.connect();
      try {
        const source = await client.query(`SELECT balance_cents FROM ${schema}.accounts WHERE account_id = $1`, [input.fromAccountId]);
        if (!source.rows.length || BigInt(source.rows[0].balance_cents) < BigInt(input.amountCents)) {
          const error = new Error('insufficient funds');
          error.code = 'INSUFFICIENT_FUNDS';
          throw error;
        }
        await client.query(`UPDATE ${schema}.accounts SET balance_cents = balance_cents - $1 WHERE account_id = $2`, [input.amountCents, input.fromAccountId]);
        await client.query(`UPDATE ${schema}.accounts SET balance_cents = balance_cents + $1 WHERE account_id = $2`, [input.amountCents, input.toAccountId]);
        await client.query(`INSERT INTO ${schema}.transfer_audit(from_account_id, to_account_id, amount_cents, note) VALUES ($1, $2, $3, $4)`, [input.fromAccountId, input.toAccountId, input.amountCents, input.note]);
        return { status: 'ok', applied: true };
      } finally {
        await client.end();
      }
    },
    async close() { closed = true; },
  };
}
