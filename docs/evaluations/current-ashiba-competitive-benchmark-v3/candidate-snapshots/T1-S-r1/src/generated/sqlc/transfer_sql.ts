import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const getAccountsForUpdateQuery = `-- name: GetAccountsForUpdate :many
SELECT account_id::text AS "accountId", balance_cents::text AS "balanceCents"
FROM accounts
WHERE account_id = ANY($1::bigint[])
ORDER BY account_id ASC
FOR UPDATE`;

export interface GetAccountsForUpdateArgs {
    accountIds: string[];
}

export interface GetAccountsForUpdateRow {
    accountid: string;
    balancecents: string;
}

export async function getAccountsForUpdate(client: Client, args: GetAccountsForUpdateArgs): Promise<GetAccountsForUpdateRow[]> {
    const result = await client.query({
        text: getAccountsForUpdateQuery,
        values: [args.accountIds],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            accountid: row[0],
            balancecents: row[1]
        };
    });
}

export const debitAccountQuery = `-- name: DebitAccount :exec
UPDATE accounts
SET balance_cents = balance_cents - $1::bigint
WHERE account_id = $2::bigint
  AND balance_cents >= $1::bigint`;

export interface DebitAccountArgs {
    amountCents: string;
    accountId: string;
}

export async function debitAccount(client: Client, args: DebitAccountArgs): Promise<void> {
    await client.query({
        text: debitAccountQuery,
        values: [args.amountCents, args.accountId],
        rowMode: "array"
    });
}

export const creditAccountQuery = `-- name: CreditAccount :exec
UPDATE accounts
SET balance_cents = balance_cents + $1::bigint
WHERE account_id = $2::bigint`;

export interface CreditAccountArgs {
    amountCents: string;
    accountId: string;
}

export async function creditAccount(client: Client, args: CreditAccountArgs): Promise<void> {
    await client.query({
        text: creditAccountQuery,
        values: [args.amountCents, args.accountId],
        rowMode: "array"
    });
}

export const createTransferAuditQuery = `-- name: CreateTransferAudit :exec
INSERT INTO transfer_audit (from_account_id, to_account_id, amount_cents, note)
VALUES (
  $1::bigint,
  $2::bigint,
  $3::bigint,
  $4::text
)`;

export interface CreateTransferAuditArgs {
    fromAccountId: string;
    toAccountId: string;
    amountCents: string;
    note: string;
}

export async function createTransferAudit(client: Client, args: CreateTransferAuditArgs): Promise<void> {
    await client.query({
        text: createTransferAuditQuery,
        values: [args.fromAccountId, args.toAccountId, args.amountCents, args.note],
        rowMode: "array"
    });
}

