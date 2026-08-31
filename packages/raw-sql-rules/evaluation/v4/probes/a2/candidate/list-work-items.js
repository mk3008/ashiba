'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SQL_BY_SORT = Object.freeze({
  updatedAt: path.join(__dirname, 'sql', 'list-work-items-by-updated-at.sql'),
  priority: path.join(__dirname, 'sql', 'list-work-items-by-priority.sql'),
});

// This is a practical no-limit value for the INT-sized fixture. It remains a
// bound value, so the optional limit never changes SQL syntax.
const MAX_LIMIT = 2147483647;

function readSql(sort) {
  const assetPath = Object.prototype.hasOwnProperty.call(SQL_BY_SORT, sort)
    ? SQL_BY_SORT[sort]
    : undefined;
  if (!assetPath) {
    throw new RangeError('sort must be "updatedAt" or "priority"');
  }
  return fs.readFileSync(assetPath, 'utf8');
}

/**
 * List work items through a mysql2-compatible native connection/pool.
 * @param {{ db: { execute: Function }, ownerId: number, state?: string, sort?: string, limit?: number }} options
 */
async function listWorkItems({ db, ownerId, state = null, sort = 'updatedAt', limit = MAX_LIMIT }) {
  if (ownerId === undefined || ownerId === null) {
    throw new TypeError('ownerId is required');
  }
  if (!db || typeof db.execute !== 'function') {
    throw new TypeError('db must provide the native execute(sql, params) API');
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('limit must be a positive integer');
  }

  const sql = readSql(sort);
  const params = [ownerId, state, state, limit];
  const [rows] = await db.execute(sql, params);
  return rows;
}

module.exports = { listWorkItems };
