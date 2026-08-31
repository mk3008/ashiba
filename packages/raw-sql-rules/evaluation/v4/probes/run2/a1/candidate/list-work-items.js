import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const SQL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sql');
const SQL = Object.freeze({
  updatedAt: Object.freeze({
    all: fs.readFileSync(path.join(SQL_DIR, 'list-updated-at.sql'), 'utf8'),
    limited: fs.readFileSync(path.join(SQL_DIR, 'list-updated-at-limit.sql'), 'utf8'),
  }),
  priority: Object.freeze({
    all: fs.readFileSync(path.join(SQL_DIR, 'list-priority.sql'), 'utf8'),
    limited: fs.readFileSync(path.join(SQL_DIR, 'list-priority-limit.sql'), 'utf8'),
  }),
});

const DEFAULT_SORT = 'updatedAt';
const VALID_STATES = new Set(['open', 'closed']);

function normalizeOwnerId(ownerId) {
  if (!Number.isSafeInteger(ownerId) || ownerId <= 0) {
    throw new TypeError('ownerId must be a positive integer');
  }
  return ownerId;
}

function normalizeState(state) {
  if (state === undefined) return null;
  if (!VALID_STATES.has(state)) {
    throw new RangeError("state must be 'open' or 'closed'");
  }
  return state;
}

function normalizeLimit(limit) {
  if (limit === undefined) return undefined;
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new TypeError('limit must be a positive integer');
  }
  return limit;
}

function chooseSql(sort, limit) {
  // Unknown sort values intentionally use the reviewed updatedAt asset.
  const sortAssets = sort === 'priority' ? SQL.priority : SQL[DEFAULT_SORT];
  return limit === undefined ? sortAssets.all : sortAssets.limited;
}

async function listWorkItems(connection, options = {}) {
  if (!connection || typeof connection.execute !== 'function') {
    throw new TypeError('connection must provide the native execute method');
  }

  const ownerId = normalizeOwnerId(options.ownerId);
  const state = normalizeState(options.state);
  const limit = normalizeLimit(options.limit);
  const sql = chooseSql(options.sort, limit);
  const params = { ownerId, state };
  // MySQL 8 rejects an integer bind in LIMIT through prepared statements;
  // the validated value is passed as a decimal string, still via a bind.
  if (limit !== undefined) params.limit = String(limit);

  const [rows] = await connection.execute(sql, params);
  return rows;
}

function createConnection(config = {}) {
  return mysql.createConnection({
    host: '127.0.0.1',
    port: 33306,
    user: 'raw_sql_rules',
    password: 'raw_sql_rules',
    database: 'raw_sql_rules',
    namedPlaceholders: true,
    ...config,
    namedPlaceholders: true,
  });
}

export { createConnection, listWorkItems };
