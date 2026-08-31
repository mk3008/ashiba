import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

const SQL_BY_SORT = Object.freeze({
  updatedAt: 'list-work-items-updated-at.sql',
  priority: 'list-work-items-priority.sql',
});

const DEFAULT_LIMIT = 50;
const STATES = new Set(['open', 'closed']);

function normalizeOptions(options = {}) {
  if (!Number.isInteger(options.ownerId)) {
    throw new TypeError('ownerId is required and must be an integer');
  }

  const state = options.state === undefined ? null : options.state;
  if (state !== null && !STATES.has(state)) {
    throw new RangeError("state must be 'open', 'closed', or omitted");
  }

  const limit = options.limit === undefined ? DEFAULT_LIMIT : options.limit;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('limit must be a positive integer');
  }

  // Unknown sort values deliberately use the stable, reviewed default query.
  const sort = Object.hasOwn(SQL_BY_SORT, options.sort) ? options.sort : 'updatedAt';
  return { ownerId: options.ownerId, state, limit, sort };
}

function sqlForSort(sort) {
  const asset = SQL_BY_SORT[sort] || SQL_BY_SORT.updatedAt;
  return fs.readFileSync(path.join(moduleDirectory, asset), 'utf8');
}

async function listWorkItems(pool, options) {
  if (!pool || typeof pool.execute !== 'function') {
    throw new TypeError('a native driver pool with execute(sql, params) is required');
  }

  const query = normalizeOptions(options);
  const [rows] = await pool.execute(sqlForSort(query.sort), {
    ownerId: query.ownerId,
    state: query.state,
    limit: query.limit,
  });
  return rows;
}

function createNativePool(config) {
  // Load the native driver only when the application opens a database connection.
  const mysql = require('mysql2/promise');
  const poolConfig = typeof config === 'string' ? connectionConfigFromUrl(config) : config;
  return mysql.createPool({ ...poolConfig, namedPlaceholders: true });
}

function connectionConfigFromUrl(value) {
  const url = new URL(value);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
  };
}

export { createNativePool, listWorkItems, normalizeOptions, sqlForSort };
