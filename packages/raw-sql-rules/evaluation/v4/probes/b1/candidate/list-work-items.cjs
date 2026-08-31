'use strict';

const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const SQL_ASSETS = Object.freeze({
  updatedAt: Object.freeze({
    all: 'list-work-items-by-updated-at.sql',
    limited: 'list-work-items-by-updated-at-limited.sql',
  }),
  priority: Object.freeze({
    all: 'list-work-items-by-priority.sql',
    limited: 'list-work-items-by-priority-limited.sql',
  }),
});

function readSqlAsset(assetName) {
  return fs.readFileSync(path.join(__dirname, 'sql', assetName), 'utf8');
}

function normalizeOptions(options) {
  if (!options || !Number.isSafeInteger(options.ownerId)) {
    throw new TypeError('ownerId is required and must be a safe integer');
  }

  const state = options.state === undefined ? null : options.state;
  if (state !== null && state !== 'open' && state !== 'closed') {
    throw new RangeError("state must be 'open', 'closed', or omitted");
  }

  const limit = options.limit === undefined ? null : options.limit;
  if (limit !== null && (!Number.isSafeInteger(limit) || limit < 1)) {
    throw new RangeError('limit must be a positive safe integer when provided');
  }

  // The finite map is also the safety boundary: arbitrary input never enters SQL.
  const sort = options.sort === 'priority' ? 'priority' : 'updatedAt';
  return { ownerId: options.ownerId, state, limit, sort };
}

async function listWorkItems(connection, options) {
  if (!connection || (typeof connection.execute !== 'function' && typeof connection.query !== 'function')) {
    throw new TypeError('a native mysql2 connection is required');
  }

  const normalized = normalizeOptions(options);
  const variant = normalized.limit === null ? 'all' : 'limited';
  const sql = readSqlAsset(SQL_ASSETS[normalized.sort][variant]);
  // MySQL rejects parameter markers in LIMIT when using prepared statements;
  // mysql2.query still binds/escapes the values through the native driver.
  const run = normalized.limit === null && typeof connection.execute === 'function'
    ? connection.execute.bind(connection)
    : connection.query.bind(connection);
  const [rows] = await run(sql, {
    ownerId: normalized.ownerId,
    state: normalized.state,
    limit: normalized.limit,
  });
  return rows;
}

function createPool(config) {
  return mysql.createPool({ ...config, namedPlaceholders: true });
}

module.exports = { createPool, listWorkItems, normalizeOptions, SQL_ASSETS };
