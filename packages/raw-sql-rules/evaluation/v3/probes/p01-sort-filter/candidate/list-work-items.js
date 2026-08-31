"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SORT = "updatedAt";
const SORT_ASSETS = Object.freeze({
  updatedAt: "list-work-items-by-updated-at.sql",
  priority: "list-work-items-by-priority.sql",
  title: "list-work-items-by-title.sql",
});

function readSqlAsset(sort) {
  const assetName = SORT_ASSETS[sort];
  if (!assetName) {
    throw new Error(`No reviewed SQL asset is registered for sort: ${sort}`);
  }
  return fs.readFileSync(path.join(__dirname, "sql", assetName), "utf8");
}

function normalizeLimit(limit) {
  const value = limit === undefined ? 50 : limit;
  if (!Number.isInteger(value) || value < 1 || value > 200) {
    throw new RangeError("limit must be an integer between 1 and 200");
  }
  return value;
}

/**
 * List work items using the driver's native named-parameter binding.
 * The db object is expected to expose prepare(sql).all(params), as in a
 * native SQLite driver. Runtime input only supplies bound values.
 */
function listWorkItems(db, input = {}) {
  if (!db || typeof db.prepare !== "function") {
    throw new TypeError("db.prepare(sql) is required");
  }
  if (!Number.isInteger(input.ownerId)) {
    throw new TypeError("ownerId must be an integer");
  }

  const sort = Object.hasOwn(SORT_ASSETS, input.sort)
    ? input.sort
    : DEFAULT_SORT;
  const state = input.state === undefined ? null : input.state;
  const params = {
    ownerId: input.ownerId,
    state,
    limit: normalizeLimit(input.limit),
  };

  return db.prepare(readSqlAsset(sort)).all(params);
}

module.exports = { DEFAULT_SORT, SORT_ASSETS, listWorkItems, readSqlAsset };
