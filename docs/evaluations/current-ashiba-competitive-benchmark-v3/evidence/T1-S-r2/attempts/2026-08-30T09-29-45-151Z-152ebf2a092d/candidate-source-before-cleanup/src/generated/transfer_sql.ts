import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const beginTransferQuery = `-- name: BeginTransfer :exec
BEGIN`;

export async function beginTransfer(client: Client): Promise<void> {
    await client.query({
        text: beginTransferQuery,
        values: [],
        rowMode: "array"
    });
}

export const commitTransferQuery = `-- name: CommitTransfer :exec
COMMIT`;

export async function commitTransfer(client: Client): Promise<void> {
    await client.query({
        text: commitTransferQuery,
        values: [],
        rowMode: "array"
    });
}

export const rollbackTransferQuery = `-- name: RollbackTransfer :exec
ROLLBACK`;

export async function rollbackTransfer(client: Client): Promise<void> {
    await client.query({
        text: rollbackTransferQuery,
        values: [],
        rowMode: "array"
    });
}

export const debitAccountQuery = `-- name: DebitAccount :one
UPDATE accounts
SET balance_cents = balance_cents - $1::bigint
WHERE account_id = $2::bigint
  AND balance_cents >= $1::bigint
RETURNING account_id, balance_cents`;

export interface DebitAccountArgs {
    amountCents: string;
    accountId: string;
}

export interface DebitAccountRow {
    accountId: string;
    balanceCents: string;
}

export async function debitAccount(client: Client, args: DebitAccountArgs): Promise<DebitAccountRow | null> {
    const result = await client.query({
        text: debitAccountQuery,
        values: [args.amountCents, args.accountId],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        accountId: row[0],
        balanceCents: row[1]
    };
}

export const creditAccountQuery = `-- name: CreditAccount :one
UPDATE accounts
SET balance_cents = balance_cents + $1::bigint
WHERE account_id = $2::bigint
RETURNING account_id, balance_cents`;

export interface CreditAccountArgs {
    amountCents: string;
    accountId: string;
}

export interface CreditAccountRow {
    accountId: string;
    balanceCents: string;
}

export async function creditAccount(client: Client, args: CreditAccountArgs): Promise<CreditAccountRow | null> {
    const result = await client.query({
        text: creditAccountQuery,
        values: [args.amountCents, args.accountId],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        accountId: row[0],
        balanceCents: row[1]
    };
}

export const recordTransferAuditQuery = `-- name: RecordTransferAudit :one
INSERT INTO transfer_audit (from_account_id, to_account_id, amount_cents, note)
VALUES (
  $1::bigint,
  $2::bigint,
  $3::bigint,
  $4::text
)
RETURNING audit_id`;

export interface RecordTransferAuditArgs {
    fromAccountId: string;
    toAccountId: string;
    amountCents: string;
    note: string;
}

export interface RecordTransferAuditRow {
    auditId: string;
}

export async function recordTransferAudit(client: Client, args: RecordTransferAuditArgs): Promise<RecordTransferAuditRow | null> {
    const result = await client.query({
        text: recordTransferAuditQuery,
        values: [args.fromAccountId, args.toAccountId, args.amountCents, args.note],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        auditId: row[0]
    };
}

