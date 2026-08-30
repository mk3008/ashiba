import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'

export interface Runtime {
  connectionString: string
  schema: string
}

export interface ApplicationError extends Error {
  code: 'VALIDATION' | 'NOT_FOUND' | 'INSUFFICIENT_FUNDS' | 'APPLICATION_CLOSED'
}

export interface Application {
  claim(input: { workerId: string }): Promise<{ claimedWorkId: string | null }>
  close(): Promise<void>
}

interface WorkItemsTable {
  id: string
  state: 'queued' | 'claimed'
  claimed_by: string | null
}

interface Database {
  work_items: WorkItemsTable
}

class CodedError extends Error implements ApplicationError {
  constructor(
    message: string,
    readonly code: ApplicationError['code'],
  ) {
    super(message)
    this.name = 'ApplicationError'
  }
}

function validationError(message: string): ApplicationError {
  return new CodedError(message, 'VALIDATION')
}

function applicationClosedError(): ApplicationError {
  return new CodedError('application is closed', 'APPLICATION_CLOSED')
}

function validateWorkerId(input: { workerId: string }): string {
  if (
    input === null ||
    typeof input !== 'object' ||
    typeof input.workerId !== 'string' ||
    input.workerId.trim().length === 0
  ) {
    throw validationError('workerId must be a non-empty string')
  }

  return input.workerId
}

export function createApplication(runtime: Runtime): Application {
  // PostgreSQL is accessed through Kysely's PostgresDialect and the supplied
  // pg pool. The runner configures the candidate role's nonce-schema search_path.
  const pool = new Pool({ connectionString: runtime.connectionString })
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  })
  let closed = false
  let closePromise: Promise<void> | undefined

  return {
    async claim(input) {
      if (closed) {
        throw applicationClosedError()
      }

      const workerId = validateWorkerId(input)
      const claimedWorkId = await db.transaction().execute(async (trx) => {
        // A locked queued row cannot be selected by another concurrent worker.
        // SKIP LOCKED lets that worker continue to the next available item.
        const next = await trx
          .selectFrom('work_items')
          .select('id')
          .where('state', '=', 'queued')
          .orderBy('id', 'asc')
          .limit(1)
          .forUpdate()
          .skipLocked()
          .executeTakeFirst()

        if (next === undefined) {
          return null
        }

        await trx
          .updateTable('work_items')
          .set({ state: 'claimed', claimed_by: workerId })
          .where('id', '=', next.id)
          .executeTakeFirstOrThrow()

        return next.id
      })

      return { claimedWorkId }
    },

    close() {
      if (closePromise === undefined) {
        closed = true
        closePromise = db.destroy()
      }

      return closePromise
    },
  }
}
