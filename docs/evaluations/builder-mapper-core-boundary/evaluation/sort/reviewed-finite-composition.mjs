import assert from 'node:assert/strict';

// Evaluation-only reference implementation. It demonstrates the security
// boundary for application-owned finite composition; it is not product code.
const reviewedTerms = Object.freeze({
  subject: Object.freeze({ asc: 'st.subject asc', desc: 'st.subject desc' }),
  createdAt: Object.freeze({ asc: 'st.created_at asc', desc: 'st.created_at desc' }),
  priority: Object.freeze({
    asc: "case st.priority when 'urgent' then 1 when 'normal' then 2 when 'low' then 3 else 4 end asc",
    desc: "case st.priority when 'urgent' then 1 when 'normal' then 2 when 'low' then 3 else 4 end desc",
  }),
});

function orderBy(input = []) {
  if (!Array.isArray(input) || input.length > 3) throw new Error('At most three sort keys are allowed.');
  const seen = new Set();
  const selected = input.map((item) => {
    if (!item || typeof item !== 'object' || !Object.hasOwn(reviewedTerms, item.key)) throw new Error('Invalid sort key.');
    if (item.direction !== 'asc' && item.direction !== 'desc') throw new Error('Invalid sort direction.');
    if (seen.has(item.key)) throw new Error('Duplicate sort key.');
    seen.add(item.key);
    return reviewedTerms[item.key][item.direction];
  });
  return `order by ${[...selected, 'st.ticket_id asc'].join(', ')}`;
}

const cases = [
  { name: 'single known key', input: [{ key: 'subject', direction: 'asc' }], expected: 'order by st.subject asc, st.ticket_id asc' },
  { name: 'multi-sort', input: [{ key: 'priority', direction: 'desc' }, { key: 'createdAt', direction: 'asc' }], expected: "order by case st.priority when 'urgent' then 1 when 'normal' then 2 when 'low' then 3 else 4 end desc, st.created_at asc, st.ticket_id asc" },
];

for (const test of cases) assert.equal(orderBy(test.input), test.expected, test.name);

const rejected = [
  { name: 'unknown key', input: [{ key: 'unknown', direction: 'asc' }] },
  { name: 'hostile key', input: [{ key: 'subject; drop table tickets; --', direction: 'asc' }] },
  { name: 'invalid direction', input: [{ key: 'subject', direction: 'ascending' }] },
  { name: 'duplicate key', input: [{ key: 'subject', direction: 'asc' }, { key: 'subject', direction: 'desc' }] },
  { name: 'too many keys', input: [{ key: 'subject', direction: 'asc' }, { key: 'createdAt', direction: 'asc' }, { key: 'priority', direction: 'asc' }, { key: 'subject', direction: 'desc' }] },
];

for (const test of rejected) assert.throws(() => orderBy(test.input), undefined, test.name);

console.log(JSON.stringify({
  kind: 'reviewed-finite-literal-composition',
  status: 'pass',
  reviewedKeys: Object.keys(reviewedTerms),
  acceptedCases: cases.map(({ name }) => name),
  rejectedCases: rejected.map(({ name }) => name),
  stableTieBreaker: 'st.ticket_id asc',
  rawExternalInputInsertedIntoSql: false,
}, null, 2));
