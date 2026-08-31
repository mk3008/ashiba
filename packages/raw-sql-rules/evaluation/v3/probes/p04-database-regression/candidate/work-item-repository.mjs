import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const readSql = (name) => fs.readFile(path.join(directory, "sql", name), "utf8");

export async function loadSchema(connection) {
  for (const statement of (await readSql("schema.sql")).split(";")) {
    if (statement.trim()) await connection.query(statement);
  }
}

export async function insertUser(connection, values) {
  return connection.execute(await readSql("insert-user.sql"), values);
}

export async function insertWorkItem(connection, values) {
  return connection.execute(await readSql("insert-work-item.sql"), values);
}

export async function listWorkItems(connection, values) {
  const [rows] = await connection.execute(await readSql("list-work-items.sql"), values);
  return rows;
}
