import assert from 'node:assert/strict';
import { listWorkItems, SQL_BY_SORT } from './list-work-items.mjs';

function fakeDatabase(rows = []) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      calls.push({ sql });
      return {
        all(parameters) {
          calls[calls.length - 1].parameters = parameters;
          return rows;
        },
      };
    },
  };
}

{
  const db = fakeDatabase([{ id: 7 }]);
  const rows = listWorkItems(db, {
    ownerId: 4,
    sort: 'priority',
    limit: 20,
  });

  assert.deepEqual(rows, [{ id: 7 }]);
  assert.equal(db.calls.length, 1);
  assert.equal(db.calls[0].sql, SQL_BY_SORT.priority);
  assert.deepEqual(db.calls[0].parameters, {
    ownerId: 4,
    state: null,
    limit: 20,
  });
}

{
  const db = fakeDatabase();
  listWorkItems(db, { ownerId: 4, sort: 'title', state: 'open' });

  assert.equal(db.calls[0].sql, SQL_BY_SORT.title);
  assert.deepEqual(db.calls[0].parameters, {
    ownerId: 4,
    state: 'open',
    limit: 50,
  });
}

{
  const db = fakeDatabase();
  assert.throws(
    () => listWorkItems(db, { ownerId: 4, sort: 'priority DESC; DROP TABLE work_items' }),
    /sort must be one of/,
  );
  assert.equal(db.calls.length, 0);
}

console.log('list-work-items tests passed');
