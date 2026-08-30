import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'

export interface Runtime {
  connectionString: string
  schema: string
}

export interface Application {
  transfer(input: {
    fromAccountId: string
    toAccountId: string
    amountCents: string
    note: string
  }): Promise<{ status: 'ok'; applied: true }>
  close(): Promise<void>
}

interface AccountsTable {
  account_id: string
  balance_cents: string
}

interface TransferAuditTable {
  from_account_id: string
  to_account_id: string
  amount_cents: string
  note: string
}

interface Database {
  accounts: AccountsTable
  transfer_audit: TransferAuditTable
}

type ErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'INSUFFICIENT_FUNDS'
  | 'APPLICATION_CLOSED'

class ApplicationError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, message: string) {
    super(message)
    this.name = 'ApplicationError'
    this.code = code
  }
}

function fail(code: ErrorCode, message: string): never {
  throw new ApplicationError(code, message)
}

function requirePositiveInteger(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) {
    return fail('VALIDATION', `${field} must be a positive base-10 integer string`)
  }

  return value
}

function requireNote(value: unknown): string {
  if (typeof value !== 'string') {
    return fail('VALIDATION', 'note must be a string')
  }

  return value
}

/**
 * Uses Kysely's PostgreSQL dialect over the candidate runtime connection.
 * The runner gives that connection a nonce-schema search path, so table names
 * remain fixed query-builder identifiers rather than runtime SQL fragments.
 */
export function createApplication(runtime: Runtime): Application {
  const pool = new Pool({ connectionString: runtime.connectionString })
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  })
  let closed = false
  let closePromise: Promise<void> | undefined

  const ensureOpen = (): void => {
    if (closed) {
      fail('APPLICATION_CLOSED', 'application is closed')
    }
  }

  return {
    async transfer(input) {
      ensureOpen()

      const fromAccountId = requirePositiveInteger(input?.fromAccountId, 'fromAccountId')
      const toAccountId = requirePositiveInteger(input?.toAccountId, 'toAccountId')
      const amountCents = requirePositiveInteger(input?.amountCents, 'amountCents')
      const note = requireNote(input?.note)
      const amount = BigInt(amountCents)

      await db.transaction().execute(async (trx) => {
        // Lock in a stable order so concurrent inverse transfers cannot deadlock.
        const accounts = await trx
          .selectFrom('accounts')
          .select(['account_id', 'balance_cents'])
          .where('account_id', 'in', [fromAccountId, toAccountId])
          .orderBy('account_id', 'asc')
          .forUpdate()
          .execute()

        const fromAccount = accounts.find((account) => account.account_id === fromAccountId)
        const toAccount = accounts.find((account) => account.account_id === toAccountId)

        if (!fromAccount || !toAccount) {
          fail('NOT_FOUND', 'account was not found')
        }

        if (BigInt(fromAccount.balance_cents) < amount) {
          fail('INSUFFICIENT_FUNDS', 'insufficient funds')
        }

        await trx
          .updateTable('accounts')
          .set((eb) => ({ balance_cents: eb('balance_cents', '-', amountCents) }))
          .where('account_id', '=', fromAccountId)
          .execute()

        await trx
          .updateTable('accounts')
          .set((eb) => ({ balance_cents: eb('balance_cents', '+', amountCents) }))
          .where('account_id', '=', toAccountId)
          .execute()

        await trx
          .insertInto('transfer_audit')
          .values({
            from_account_id: fromAccountId,
            to_account_id: toAccountId,
            amount_cents: amountCents,
            note,
          })
          .execute()
      })

      return { status: 'ok', applied: true }
    },

    close() {
      if (!closePromise) {
        closed = true
        closePromise = db.destroy()
      }

      return closePromise
    },
  }
}
