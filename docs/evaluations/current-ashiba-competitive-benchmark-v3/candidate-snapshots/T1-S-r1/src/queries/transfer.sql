-- name: GetAccountsForUpdate :many
SELECT account_id::text AS "accountId", balance_cents::text AS "balanceCents"
FROM accounts
WHERE account_id = ANY(sqlc.arg(account_ids)::bigint[])
ORDER BY account_id ASC
FOR UPDATE;

-- name: DebitAccount :exec
UPDATE accounts
SET balance_cents = balance_cents - sqlc.arg(amount_cents)::bigint
WHERE account_id = sqlc.arg(account_id)::bigint
  AND balance_cents >= sqlc.arg(amount_cents)::bigint;

-- name: CreditAccount :exec
UPDATE accounts
SET balance_cents = balance_cents + sqlc.arg(amount_cents)::bigint
WHERE account_id = sqlc.arg(account_id)::bigint;

-- name: CreateTransferAudit :exec
INSERT INTO transfer_audit (from_account_id, to_account_id, amount_cents, note)
VALUES (
  sqlc.arg(from_account_id)::bigint,
  sqlc.arg(to_account_id)::bigint,
  sqlc.arg(amount_cents)::bigint,
  sqlc.arg(note)::text
);
