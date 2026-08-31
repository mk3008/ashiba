import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Each value is a complete, reviewed SQL asset. Runtime input selects a key;
// it never supplies SQL syntax.
const SQL_BY_SORT = Object.freeze({
  updatedAt: fs.readFileSync(
    path.join(__dirname, 'sql', 'list-work-items-updated.sql'),
    'utf8',
  ),
  priority: fs.readFileSync(
    path.join(__dirname, 'sql', 'list-work-items-priority.sql'),
    'utf8',
  ),
  title: fs.readFileSync(
    path.join(__dirname, 'sql', 'list-work-items-title.sql'),
    'utf8',
  ),
});

/**
 * List an owner's work items using a native prepared-statement API.
 *
 * `db` is the application-owned connection. It must expose the native
 * `prepare(sql).all(namedParameters)` operation (as in better-sqlite3).
 * The result rows are returned unchanged so the driver's runtime types stay
 * authoritative at the application boundary.
 */
export function listWorkItems(db, input) {
  if (!db || typeof db.prepare !== 'function') {
    throw new TypeError('db must provide prepare(sql)');
  }
  if (!input || typeof input !== 'object') {
    throw new TypeError('input is required');
  }

  const { ownerId, sort, state, limit = 50 } = input;
  if (!Number.isInteger(ownerId)) {
    throw new TypeError('ownerId must be an integer');
  }
  if (typeof sort !== 'string' || !Object.prototype.hasOwnProperty.call(SQL_BY_SORT, sort)) {
    throw new RangeError('sort must be one of: updatedAt, priority, title');
  }
  if (state !== undefined && state !== null && typeof state !== 'string') {
    throw new TypeError('state must be a string when provided');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new RangeError('limit must be an integer from 1 to 500');
  }

  const statement = db.prepare(SQL_BY_SORT[sort]);
  return statement.all({
    ownerId,
    state: state ?? null,
    limit,
  });
}

export { SQL_BY_SORT };
