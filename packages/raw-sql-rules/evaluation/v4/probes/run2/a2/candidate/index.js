import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SQL_BY_SORT = Object.freeze({
  updatedAt: readFileSync(path.join(__dirname, 'sql', 'list_work_items_updated_at.sql'), 'utf8'),
  priority: readFileSync(path.join(__dirname, 'sql', 'list_work_items_priority.sql'), 'utf8'),
});

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

function normalizeOwnerId(ownerId) {
  if (!Number.isInteger(ownerId)) {
    throw new TypeError('ownerId is required and must be an integer');
  }
  return ownerId;
}

function normalizeState(state) {
  if (state === undefined || state === null) return null;
  if (state !== 'open' && state !== 'closed') {
    throw new TypeError("state must be 'open' or 'closed'");
  }
  return state;
}

function normalizeLimit(limit) {
  if (limit === undefined) return DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new RangeError(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  return limit;
}

function sqlForSort(sort) {
  // Unknown sort values deliberately map to the reviewed updatedAt asset.
  return Object.hasOwn(SQL_BY_SORT, sort) ? SQL_BY_SORT[sort] : SQL_BY_SORT.updatedAt;
}

async function listWorkItems(pool, { ownerId, state, sort, limit } = {}) {
  const params = {
    ownerId: normalizeOwnerId(ownerId),
    state: normalizeState(state),
    limit: normalizeLimit(limit),
  };
  const [rows] = await pool.query(sqlForSort(sort), params);
  return rows;
}

function createPool(config = {}) {
  const mysql = require('mysql2/promise');
  return mysql.createPool({
    host: '127.0.0.1',
    port: 33306,
    database: 'raw_sql_rules',
    user: 'raw_sql_rules',
    password: 'raw_sql_rules',
    ...config,
    namedPlaceholders: true,
  });
}

export {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  createPool,
  listWorkItems,
  sqlForSort,
};
