import assert from "node:assert/strict";
import test from "node:test";
import { __test, createApplication } from "./application.js";

test("list defaults and explicit null assignee filtering remain distinct", () => {
  assert.deepEqual(__test.normaliseListInput(undefined), {
    statusFilter: null,
    assigneeIsFiltered: false,
    assigneeFilter: null,
    sort: "id",
    direction: "asc",
    offsetValue: 0,
    limitValue: 100,
  });
  assert.deepEqual(__test.normaliseListInput({ assignee: null }), {
    statusFilter: null,
    assigneeIsFiltered: true,
    assigneeFilter: null,
    sort: "id",
    direction: "asc",
    offsetValue: 0,
    limitValue: 100,
  });
});

test("invalid pagination and identifiers use application validation errors", () => {
  assert.throws(() => __test.normaliseListInput({ limit: 101 }), { code: "VALIDATION" });
  assert.throws(() => __test.positiveId("0", "id"), { code: "VALIDATION" });
});

test("close is idempotent and rejects future operations before connecting", async () => {
  const app = createApplication({ connectionString: "postgresql://invalid.invalid/not-used", schema: "unused" });
  await app.close();
  await app.close();
  await assert.rejects(app.get({ id: "1" }), { code: "APPLICATION_CLOSED" });
});
