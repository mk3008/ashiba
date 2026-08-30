-- name: GetAccountsForUpdate :many
SELECT account_id::text AS "accountId", balance_cents::text AS "balanceCents"
FROM accounts
WHERE account_id = ANY($1::bigint[])
ORDER BY account_id ASC
FOR UPDATE;

-- name: DebitAccount :exec
UPDATE accounts
SET balance_cents = balance_cents - $2::bigint
WHERE account_id = $1::bigint
  AND balance_cents >= $2::bigint;

-- name: CreditAccount :exec
UPDATE accounts
SET balance_cents = balance_cents + $2::bigint
WHERE account_id = $1::bigint;

-- name: CreateTransferAudit :exec
INSERT INTO transfer_audit (from_account_id, to_account_id, amount_cents, note)
VALUES ($1::bigint, $2::bigint, $3::bigint, $4::text);
