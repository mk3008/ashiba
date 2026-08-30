/**
 * The only candidate-facing contract used by the frozen runner.
 * This module contains names and input examples, not candidate code.
 */
export const API_OPERATIONS = Object.freeze([
  'list',
  'get',
  'create',
  'assign',
  'transfer',
  'claim',
  'investigate',
  'explain',
  'close',
]);

export const API_CONTRACT_REFERENCE = Object.freeze({
  runtime: ['connectionString', 'schema'],
  list: { status: 'open', assignee: 'alice', sort: 'priority', direction: 'desc', offset: 0, limit: 10 },
  get: { id: '101' },
  create: { title: 'Runner-created ticket', status: 'open', assignee: null, priority: 2 },
  assign: { id: '103', assignee: 'carol' },
  transfer: { fromAccountId: '7001', toAccountId: '7002', amountCents: '1250', note: 'runner control' },
  claim: { workerId: 'worker-a' },
  investigate: { requestedTag: 'vip', tier: 'gold' },
  explain: { requestedTag: 'vip', tier: 'gold' },
  close: {},
});

export function assertApiShape(application) {
  const missing = API_OPERATIONS.filter((operation) => typeof application?.[operation] !== 'function');
  if (missing.length) throw new Error(`candidate API missing operations: ${missing.join(', ')}`);
  return application;
}
