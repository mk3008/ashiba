/**
 * The only candidate-facing contract used by the frozen runner.
 * This module contains names and input examples, not candidate code.
 */
export const WORKLOAD_OPERATIONS = Object.freeze({
  G1: Object.freeze(['list', 'get', 'create', 'assign', 'close']),
  T1: Object.freeze(['transfer', 'close']),
  T2: Object.freeze(['claim', 'close']),
  Q1: Object.freeze(['investigate', 'explain', 'close']),
});

export const API_OPERATIONS = Object.freeze([...new Set(Object.values(WORKLOAD_OPERATIONS).flat())]);

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

export function assertApiShape(application, operations = API_OPERATIONS) {
  const missing = operations.filter((operation) => typeof application?.[operation] !== 'function');
  if (missing.length) throw new Error(`candidate API missing operations: ${missing.join(', ')}`);
  return application;
}
