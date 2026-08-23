import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listOrdering } from '../application/list-ordering.mjs';
import { lowerNamedParameters } from './g1-lower.mjs';
import { verify } from './verify.mjs';
const fixture = dirname(dirname(fileURLToPath(import.meta.url)));
const artifact = () => JSON.parse(readFileSync(join(fixture, 'artifacts/list.placement.json'), 'utf8'));

export function compile(sort = []) {
  const errors = verify(); if (errors.length) throw new Error(errors.join('; '));
  if (!Array.isArray(sort) || sort.length > listOrdering.maxKeys) throw new Error('invalid sort count');
  const seen = new Set(); const fragments = [];
  for (const item of sort) {
    if (!item || typeof item.key !== 'string' || !/^(asc|desc)$/.test(item.direction) || seen.has(item.key)) throw new Error('invalid sort request');
    const expression = listOrdering.keys[item.key]?.[item.direction];
    if (!expression) throw new Error('unknown sort key');
    seen.add(item.key); fragments.push(expression);
  }
  const placement = artifact().sortInsertion;
  let sql = readFileSync(join(fixture, 'queries/list.sql'), 'utf8');
  if (fragments.length) sql = `${sql.slice(0, placement.index)}${fragments.join(', ')}, ${sql.slice(placement.index)}`;
  return lowerNamedParameters(sql);
}
