import { readFileSync } from 'node:fs';
import { createPool } from 'mysql2/promise';

const LIMITED_SQL = readFileSync(new URL('./list-work-items.sql', import.meta.url), 'utf8');
const UNLIMITED_SQL = readFileSync(new URL('./list-work-items-unlimited.sql', import.meta.url), 'utf8');

const SORTS = new Set(['updatedAt', 'priority']);
const STATES = new Set(['open', 'closed']);

/**
 * Create a mysql2 pool configured for the named parameters in the SQL assets.
 * The returned pool is the native driver object; callers own its lifecycle.
 */
export function createWorkItemPool(config) {
  return createPool({ ...config, namedPlaceholders: true });
}

function validateOptions(options) {
  if (!options || !Number.isInteger(options.ownerId)) {
    throw new TypeError('ownerId is required and must be an integer');
  }

  if (options.state !== undefined && options.state !== null && !STATES.has(options.state)) {
    throw new RangeError('state must be open or closed');
  }

  if (options.limit !== undefined && options.limit !== null &&
      (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new RangeError('limit must be a positive integer');
  }
}

/**
 * List an owner's work items through a mysql2 connection or pool.
 * Unknown sort values deliberately use the safe, deterministic updatedAt order.
 */
export async function listWorkItems(connection, options) {
  validateOptions(options);

  const limit = options.limit ?? null;
  const params = {
    ownerId: options.ownerId,
    state: options.state ?? null,
    sort: SORTS.has(options.sort) ? options.sort : 'updatedAt',
  };

  if (limit !== null) {
    params.limit = limit;
    const [rows] = await connection.execute(LIMITED_SQL, params);
    return rows;
  }

  const [rows] = await connection.execute(UNLIMITED_SQL, params);
  return rows;
}

export const sqlAssets = Object.freeze({ limited: LIMITED_SQL, unlimited: UNLIMITED_SQL });
