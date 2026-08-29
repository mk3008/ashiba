import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('.', import.meta.url);
const read = (name) => readFileSync(new URL(name, root), 'utf8');
const sql = read('list-customer-orders.sql');
const bindings = read('list-customer-orders.bindings.ts');
const application = read('application-path.ts');

const required = [
  ['JOIN', /\bjoin\s+customers\b/i],
  ['nullable filter', /:\s*status\s+is\s+null/i],
  ['limit', /\blimit\s+:limit\b/i],
  ['multiple results', /o\.order_id[\s\S]*o\.created_at[\s\S]*customer_name/i],
  ['native driver boundary', /pool\.query\(bound\.sql, bound\.values\)/],
  ['named binder', /bindNamedParameters\(/],
];
for (const [label, pattern] of required) {
  if (!pattern.test(label === 'native driver boundary' || label === 'named binder' ? application : sql)) {
    throw new Error(`missing ${label}`);
  }
}

const names = [...bindings.matchAll(/parameterNames: \[([^\]]+)\]/g)][0]?.[1] ?? '';
const expectedNames = ['store_id', 'status', 'created_after', 'limit'];
for (const name of expectedNames) {
  if (!names.includes(`'${name}'`)) throw new Error(`missing binding name ${name}`);
}
for (const placeholder of ['$1', '$2', '$3', '$4']) {
  if (!bindings.includes(placeholder)) throw new Error(`missing placeholder ${placeholder}`);
}
if (/\$\{[^}]+\}|\+\s*params|interpolat/i.test(application)) {
  throw new Error('application path appears to interpolate values into SQL');
}

console.log('AI_TRIAL_SHAPE=pass');
console.log('CANONICAL_SQL=visible');
console.log('BINDING_ORDER=store_id,status,created_after,limit');
console.log('NATIVE_DRIVER_CALL=pool.query(bound.sql,bound.values)');
