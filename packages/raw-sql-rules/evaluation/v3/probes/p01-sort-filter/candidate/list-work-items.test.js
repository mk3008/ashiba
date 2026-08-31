"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { listWorkItems, readSqlAsset } = require("./list-work-items");

function recordingDb(rows = []) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        all(params) {
          calls.push({ sql, params });
          return rows;
        },
      };
    },
  };
}

test("uses the requested reviewed sort asset and binds an optional state", () => {
  const db = recordingDb([{ id: 7 }]);

  const rows = listWorkItems(db, { ownerId: 4, sort: "priority", state: "open", limit: 10 });

  assert.deepEqual(rows, [{ id: 7 }]);
  assert.match(db.calls[0].sql, /ORDER BY priority DESC/);
  assert.deepEqual(db.calls[0].params, { ownerId: 4, state: "open", limit: 10 });
  assert.match(db.calls[0].sql, /:state IS NULL OR state = :state/);
});

test("maps an unrecognized sort to the safe default and null-binds missing state", () => {
  const db = recordingDb();

  listWorkItems(db, { ownerId: 4, sort: "state" });

  assert.match(db.calls[0].sql, /ORDER BY updated_at DESC/);
  assert.equal(db.calls[0].params.state, null);
});

test("all reviewed assets use named bindings and no interpolated input", () => {
  for (const sort of ["updatedAt", "priority", "title"]) {
    const sql = readSqlAsset(sort);
    assert.match(sql, /:ownerId/);
    assert.match(sql, /:state/);
    assert.match(sql, /:limit/);
    assert.doesNotMatch(sql, /\$\{|\+\s*input|`/);
  }
});
