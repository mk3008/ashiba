-- name: BeginTransfer :exec
BEGIN;

-- name: CommitTransfer :exec
COMMIT;

-- name: RollbackTransfer :exec
ROLLBACK;

-- name: DebitAccount :one
UPDATE accounts
SET balance_cents = balance_cents - sqlc.arg(amount_cents)::bigint
WHERE account_id = sqlc.arg(account_id)::bigint
  AND balance_cents >= sqlc.arg(amount_cents)::bigint
RETURNING account_id, balance_cents;

-- name: CreditAccount :one
UPDATE accounts
SET balance_cents = balance_cents + sqlc.arg(amount_cents)::bigint
WHERE account_id = sqlc.arg(account_id)::bigint
RETURNING account_id, balance_cents;

-- name: RecordTransferAudit :one
INSERT INTO transfer_audit (from_account_id, to_account_id, amount_cents, note)
VALUES (
  sqlc.arg(from_account_id)::bigint,
  sqlc.arg(to_account_id)::bigint,
  sqlc.arg(amount_cents)::bigint,
  sqlc.arg(note)::text
)
RETURNING audit_id;
