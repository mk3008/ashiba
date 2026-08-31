import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SQL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sql');
const SQL_BY_SORT = Object.freeze({
  updatedAt: readFileSync(path.join(SQL_DIR, 'list-work-items-updated-at.sql'), 'utf8'),
  priority: readFileSync(path.join(SQL_DIR, 'list-work-items-priority.sql'), 'utf8'),
});
const DEFAULT_SORT = 'updatedAt';
const DEFAULT_LIMIT = 100;

function normalizeSort(sort) {
  return Object.prototype.hasOwnProperty.call(SQL_BY_SORT, sort) ? sort : DEFAULT_SORT;
}

function normalizeFilters({ ownerId, state, sort, limit } = {}) {
  if (!Number.isInteger(ownerId)) {
    throw new TypeError('ownerId is required and must be an integer');
  }
  if (state !== undefined && state !== null && state !== 'open' && state !== 'closed') {
    throw new TypeError("state must be 'open' or 'closed'");
  }
  const normalizedLimit = limit === undefined ? DEFAULT_LIMIT : limit;
  if (!Number.isInteger(normalizedLimit) || normalizedLimit < 1) {
    throw new TypeError('limit must be a positive integer');
  }
  return {
    ownerId,
    state: state ?? null,
    limit: normalizedLimit,
    sort: normalizeSort(sort),
  };
}

/** Execute a reviewed SQL asset with a mysql2 connection or pool. */
async function listWorkItems(db, filters) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('a mysql2 connection or pool is required');
  }
  const normalized = normalizeFilters(filters);
  // mysql2's prepared statements reject parameter markers directly in LIMIT.
  // query() still uses mysql2's escaping/binding mechanism for every value.
  const [rows] = await db.query(SQL_BY_SORT[normalized.sort], {
    ownerId: normalized.ownerId,
    state: normalized.state,
    limit: normalized.limit,
  });
  return rows;
}

export { listWorkItems, normalizeFilters, normalizeSort, SQL_BY_SORT };
