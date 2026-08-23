import { Pool } from 'pg';

export function createPool(connectionString = process.env.DATABASE_URL): Pool {
  if (!connectionString) throw new Error('Set DATABASE_URL.');
  return new Pool({ connectionString });
}
