import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const fail = (message) => {
  process.stderr.write(`FAIL ${message}\n`);
  process.exitCode = 1;
};

const required = [
  "README.md",
  "RULES.md",
  "EVALUATION_PLAN.md",
  "EVALUATION_REPORT.md",
  "POSTGRESQL_ADAPTATION.md",
  "scenarios/manifest.md",
  "fixtures/schema/users.sql",
  "fixtures/schema/work_items.sql",
  "fixtures/queries/find-work-items.sql",
  "fixtures/queries/create-user.sql",
  "fixtures/queries/update-work-item-state.sql",
  "fixtures/queries/delete-work-item.sql",
  "evidence/rules-v0.sha256",
  "evidence/rules-v1.sha256",
  "evidence/rules-v2.sha256",
  "evidence/v0-independent-judgments.md",
  "evidence/v1-regression.md",
  "evidence/v1-important-boundary-matrix.md",
  "evidence/v2-database-boundary-matrix.md",
  "evidence/amendments.md",
  "evaluation/v3/PLAN.md",
  "evaluation/v3/live-mysql/run-live.mjs",
  "evidence/v3/AMENDMENT.md",
  "evidence/v3/rules-v3.sha256",
  "evidence/v3/live-mysql.md",
  "evidence/v3/probe-agent-output.md",
  "evidence/v3/implementation-reviews.md",
  "evidence/v3/harness-corrections.md",
  "evidence/v3/verification.md",
  "evaluation/v3/probes/p01-sort-filter/candidate/list-work-items.js",
  "evaluation/v3/probes/p02-schema-context/candidate/account_status.py",
  "evaluation/v3/probes/p03-difficult-query/candidate/report.py",
  "evaluation/v3/probes/p04-database-regression/candidate/database-regression.test.mjs",
  "evaluation/v3/probes/p05-sort-filter-decider/candidate/list-work-items.mjs",
];
for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) fail(`missing ${relative}`);
}

const rules = read("RULES.md");
for (const phrase of [
  "independent `.sql` assets",
  "canonical DDL",
  "finite whitelist",
  "complete reviewed SQL assets",
  "native named",
  "must not grow into a framework",
]) {
  if (!rules.includes(phrase)) fail(`RULES.md lacks required contract phrase: ${phrase}`);
}

const queryDirectory = path.join(root, "fixtures/queries");
const queryFiles = fs.readdirSync(queryDirectory).filter((file) => file.endsWith(".sql"));
if (queryFiles.length < 4) fail("expected at least four application SQL assets");
for (const file of queryFiles) {
  const sql = fs.readFileSync(path.join(queryDirectory, file), "utf8");
  if (/\$\{[^}]+\}/.test(sql)) fail(`${file} contains interpolation syntax`);
}

const namedFixture = read("fixtures/queries/find-work-items.sql");
for (const name of [":ownerId", ":state", ":afterUpdatedAt", ":limit"]) {
  if (!namedFixture.includes(name)) fail(`named fixture lacks ${name}`);
}

const packageFiles = fs.readdirSync(root, { recursive: true })
  .filter((entry) => typeof entry === "string" && entry.endsWith("package.json"));
for (const file of packageFiles) {
  const manifest = read(file);
  if (/@ashiba-ts\/|prisma|drizzle|kysely|sqlc/i.test(manifest)) {
    fail(`${file} introduces prohibited dependency text`);
  }
}

const manifest = JSON.parse(read("package.json"));
if (manifest.scripts?.test !== "node scripts/check.mjs") {
  fail("package test must run the deterministic package check for recursive CI");
}
if (manifest.scripts?.["test:live"] !== "node evaluation/v3/live-mysql/run-live.mjs") {
  fail("package must retain the explicit MySQL live-lane command");
}

if (process.exitCode) process.exit(process.exitCode);
process.stdout.write(`PASS ${required.length} required artifacts; ${queryFiles.length} SQL assets; no interpolation or prohibited package dependencies\n`);
