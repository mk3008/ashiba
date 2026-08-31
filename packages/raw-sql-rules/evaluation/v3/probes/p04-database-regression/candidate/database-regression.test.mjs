import assert from "node:assert/strict";
import test from "node:test";
import mysql from "mysql2/promise";
import {
  insertUser,
  insertWorkItem,
  listWorkItems,
  loadSchema,
} from "./work-item-repository.mjs";

const connectionOptions = {
  host: process.env.RAW_SQL_RULES_MYSQL_HOST ?? "127.0.0.1",
  port: Number(process.env.RAW_SQL_RULES_MYSQL_PORT ?? "33306"),
  user: process.env.RAW_SQL_RULES_MYSQL_USER ?? "raw_sql_rules",
  password: process.env.RAW_SQL_RULES_MYSQL_PASSWORD ?? "raw_sql_rules",
  database: process.env.RAW_SQL_RULES_MYSQL_DATABASE ?? "raw_sql_rules",
  namedPlaceholders: true,
  // Keep the driver's JSON result representation explicit and regression-tested.
  jsonStrings: true,
};

test("database preserves the work-item result field and its mysql2 representation", async () => {
  const connection = await mysql.createConnection(connectionOptions);
  const createdAt = new Date("2026-08-31T00:00:00.000Z");
  const email = `p04-${Date.now()}@example.test`;

  try {
    await connection.query("DROP TABLE IF EXISTS p04_work_items");
    await connection.query("DROP TABLE IF EXISTS p04_users");
    await loadSchema(connection);

    const [userResult] = await insertUser(connection, {
      email,
      displayName: "Ada",
      createdAt,
    });
    assert.equal(userResult.affectedRows, 1);

    const result = { status: "completed", attempts: 1 };
    const [itemResult] = await insertWorkItem(connection, {
      ownerId: userResult.insertId,
      state: "open",
      priority: 7,
      amount: "12.34",
      metadata: JSON.stringify({ source: "p04-regression" }),
      result: JSON.stringify(result),
      createdAt,
    });
    assert.equal(itemResult.affectedRows, 1);

    const rows = await listWorkItems(connection, {
      ownerId: userResult.insertId,
      state: "open",
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].state, "open");
    assert.equal(rows[0].priority, 7);
    assert.equal(typeof rows[0].result, "string");
    assert.deepEqual(JSON.parse(rows[0].result), result);
  } finally {
    await connection.query("DROP TABLE IF EXISTS p04_work_items");
    await connection.query("DROP TABLE IF EXISTS p04_users");
    await connection.end();
  }
});
