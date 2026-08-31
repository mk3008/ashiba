import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const candidateDirectory = path.dirname(fileURLToPath(import.meta.url));
const applicationSql = await fs.readFile(path.join(candidateDirectory, 'list-work-items.sql'), 'utf8');

function normalizeFilters({ ownerId, state } = {}) {
  if (!Number.isSafeInteger(ownerId) || ownerId <= 0) {
    throw new TypeError('ownerId is required and must be a positive integer');
  }
  if (state !== undefined && state !== null && state !== 'open' && state !== 'closed') {
    throw new TypeError("state must be 'open' or 'closed'");
  }
  return { ownerId, state: state ?? null };
}

async function listWorkItems(connection, filters) {
  if (!connection || typeof connection.execute !== 'function') {
    throw new TypeError('a native mysql2 connection or pool is required');
  }
  const normalized = normalizeFilters(filters);
  const [rows] = await connection.execute(applicationSql, normalized);
  return rows;
}

export { listWorkItems, normalizeFilters };
