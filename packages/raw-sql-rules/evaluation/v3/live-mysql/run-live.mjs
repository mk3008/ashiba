import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const directory = path.dirname(fileURLToPath(import.meta.url));
const sql = (name) => fs.readFile(path.join(directory, "sql", name), "utf8");
const connection = await mysql.createConnection({
  host: process.env.RAW_SQL_RULES_MYSQL_HOST ?? "127.0.0.1",
  port: Number(process.env.RAW_SQL_RULES_MYSQL_PORT ?? "33306"),
  user: process.env.RAW_SQL_RULES_MYSQL_USER ?? "raw_sql_rules",
  password: process.env.RAW_SQL_RULES_MYSQL_PASSWORD ?? "raw_sql_rules",
  database: process.env.RAW_SQL_RULES_MYSQL_DATABASE ?? "raw_sql_rules",
  namedPlaceholders: true,
});

try {
  await connection.query("DROP TABLE IF EXISTS work_items");
  await connection.query("DROP TABLE IF EXISTS users");
  for (const statement of (await sql("schema.sql")).split(";")) {
    if (statement.trim()) await connection.query(statement);
  }
  const createdAt = new Date("2026-08-31T00:00:00.000Z");
  const hostileEmail = "ada@example.test' OR 1=1 --";
  const insertUser = await sql("insert-user.sql");
  const [userResult] = await connection.execute(insertUser, { email: hostileEmail, displayName: "Ada", createdAt });
  assert.equal(userResult.affectedRows, 1);
  await assert.rejects(
    () => connection.execute(insertUser, { email: hostileEmail, displayName: "Duplicate", createdAt }),
    (error) => error?.code === "ER_DUP_ENTRY",
  );
  const [itemResult] = await connection.execute(await sql("insert-work-item.sql"), {
    ownerId: userResult.insertId, state: "open", priority: 7, amount: "12.34",
    metadata: JSON.stringify({ source: "live-lane" }), createdAt,
  });
  assert.equal(itemResult.affectedRows, 1);
  const queries = { newest: await sql("list-work-items-by-created.sql"), priority: await sql("list-work-items-by-priority.sql") };
  const [rows] = await connection.execute(queries.priority, { ownerId: userResult.insertId, state: "open" });
  const [unfilteredRows] = await connection.execute(queries.newest, { ownerId: userResult.insertId, state: null });
  assert.equal(rows.length, 1);
  assert.equal(unfilteredRows.length, 1);
  assert.equal(rows[0].state, "open");
  assert.equal(rows[0].priority, 7);
  process.stdout.write(`${JSON.stringify({
    driver: "mysql2@3.22.3", database: "mysql:8.4",
    namedParameterMode: "mysql2 namedPlaceholders: true with :name SQL and object bindings",
    queryBehavior: { filteredRows: rows.length, unfilteredRows: unfilteredRows.length },
    constraint: "duplicate email rejected with ER_DUP_ENTRY",
    runtimeRepresentation: Object.fromEntries(["id", "owner_id", "priority", "amount", "metadata", "created_at"].map((key) => [key, {
      type: typeof rows[0][key], constructor: rows[0][key]?.constructor?.name ?? null, value: String(rows[0][key]),
    }])),
  }, null, 2)}\n`);
} finally {
  await connection.query("DROP TABLE IF EXISTS work_items");
  await connection.query("DROP TABLE IF EXISTS users");
  await connection.end();
}
