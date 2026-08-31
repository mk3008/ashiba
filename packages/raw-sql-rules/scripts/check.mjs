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
  "named parameters",
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

if (process.exitCode) process.exit(process.exitCode);
process.stdout.write(`PASS ${required.length} required artifacts; ${queryFiles.length} SQL assets; no interpolation or prohibited package dependencies\n`);
