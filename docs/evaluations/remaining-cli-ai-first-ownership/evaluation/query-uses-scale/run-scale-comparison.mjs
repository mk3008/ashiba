#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/[A-Za-z]:/, (value) => value.slice(1));
const REPO_ROOT = path.resolve(HERE, '../../../../..');
const CLI = path.join(REPO_ROOT, 'packages', 'cli', 'dist', 'index.js');
const TARGET_TABLE = 'public.accounts';
const TARGET_COLUMN = 'public.accounts.account_id';
const SIZES = { small: 20, medium: 300, large: 3000 };
const TEMPLATE_COUNT = 12;

const templates = [
  {
    name: 'alias-qualified', table: true, column: true,
    sql: `SELECT a.account_id, a.status\nFROM public.accounts AS a\nWHERE a.account_id = :accountId;\n`,
  },
  {
    name: 'schema-qualified', table: true, column: true,
    sql: `SELECT public.accounts.account_id\nFROM public.accounts\nWHERE public.accounts.account_id > 0;\n`,
  },
  {
    name: 'unqualified-column', table: true, column: true,
    sql: `SELECT account_id, status\nFROM public.accounts\nWHERE account_id IS NOT NULL;\n`,
  },
  {
    name: 'join-and-alias', table: true, column: true,
    sql: `SELECT a.account_id, o.account_id AS order_account_id\nFROM sales.orders AS o\nJOIN public.accounts AS a ON a.account_id = o.account_id\nWHERE o.created_at > :since;\n`,
  },
  {
    name: 'cte', table: true, column: true,
    sql: `WITH active_accounts AS (\n  SELECT a.account_id\n  FROM public.accounts AS a\n  WHERE a.status = 'active'\n)\nSELECT active_accounts.account_id\nFROM active_accounts;\n`,
  },
  {
    name: 'subquery', table: true, column: true,
    sql: `SELECT o.id\nFROM sales.orders AS o\nWHERE o.account_id IN (\n  SELECT a.account_id FROM public.accounts AS a WHERE a.region = :region\n);\n`,
  },
  {
    name: 'comment-and-string-only', table: false, column: false,
    sql: `-- public.accounts and public.accounts.account_id are documentation only\nSELECT o.id, 'public.accounts.account_id' AS identifier_example\nFROM sales.orders AS o\nWHERE o.status = 'open';\n`,
  },
  {
    name: 'duplicate-column-names', table: true, column: true,
    sql: `SELECT a.account_id, o.account_id\nFROM public.accounts AS a\nJOIN sales.orders AS o ON o.account_id = a.account_id;\n`,
  },
  {
    name: 'select-star', table: true, column: true,
    sql: `SELECT *\nFROM public.accounts AS a;\n`,
  },
  {
    name: 'alias-star-unqualified', table: true, column: true,
    sql: `SELECT a.*\nFROM public.accounts AS a\nWHERE account_id = :accountId;\n`,
  },
  {
    name: 'near-name-control', table: false, column: false,
    sql: `SELECT aa.account_id\nFROM public.accounts_archive AS aa\nWHERE aa.account_id = :accountId;\n`,
  },
  {
    name: 'join-using', table: true, column: true,
    sql: `SELECT *\nFROM public.accounts AS a\nJOIN sales.orders AS o USING (account_id);\n`,
  },
];

function usage(message) {
  console.error(message);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { sizes: Object.keys(SIZES), includeParserFailure: false, keepFixtures: false, output: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--sizes') {
      args.sizes = argv[++index]?.split(',').map((size) => size.trim()).filter(Boolean) ?? [];
    } else if (arg === '--include-parser-failure') {
      args.includeParserFailure = true;
    } else if (arg === '--keep-fixtures') {
      args.keepFixtures = true;
    } else if (arg === '--output') {
      args.output = argv[++index] ?? usage('--output requires a path');
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node run-scale-comparison.mjs [--sizes small,medium,large] [--include-parser-failure] [--keep-fixtures] [--output path]');
      process.exit(0);
    } else {
      usage(`Unknown argument: ${arg}`);
    }
  }
  for (const size of args.sizes) {
    if (!(size in SIZES)) usage(`Unknown size: ${size}`);
  }
  return args;
}

function fixtureTemplate(index, includeParserFailure) {
  if (includeParserFailure && index === 0) {
    return {
      name: 'parser-failure', table: true, column: true,
      sql: `SELECT * FROM public.accounts lateral nonsense;\n`,
      parserFailure: true,
    };
  }
  return templates[index % templates.length];
}

function writeFixture(root, count, includeParserFailure) {
  const sqlDir = path.join(root, 'sql');
  const specsDir = path.join(root, 'specs');
  mkdirSync(sqlDir, { recursive: true });
  mkdirSync(specsDir, { recursive: true });
  const truth = [];
  for (let index = 0; index < count; index += 1) {
    const id = `q-${String(index + 1).padStart(4, '0')}`;
    const selected = fixtureTemplate(index, includeParserFailure);
    const sqlName = `${id}.sql`;
    const specName = `${id}.spec.json`;
    writeFileSync(path.join(sqlDir, sqlName), selected.sql, 'utf8');
    writeFileSync(path.join(specsDir, specName), JSON.stringify({ id, sqlFile: `../sql/${sqlName}` }) + '\n', 'utf8');
    truth.push({
      catalogId: id,
      queryId: `${id}:1`,
      template: selected.name,
      table: selected.table,
      column: selected.column,
      parserFailure: Boolean(selected.parserFailure),
    });
  }
  writeFileSync(path.join(root, 'manifest.json'), JSON.stringify({ count, includeParserFailure, targetTable: TARGET_TABLE, targetColumn: TARGET_COLUMN, truth }, null, 2) + '\n', 'utf8');
  return truth;
}

function runProcess(command, args, cwd) {
  const started = performance.now();
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  return {
    ...result,
    wallMs: Number((performance.now() - started).toFixed(3)),
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function runAshiba(root, kind, target, allowParserFallback = false) {
  const args = [CLI, 'query', 'uses', kind, target, '--root-dir', root, '--format', 'json'];
  if (allowParserFallback) args.push('--allow-parser-fallback');
  const processResult = runProcess(process.execPath, args, REPO_ROOT);
  let report = null;
  if (processResult.status === 0) {
    try {
      report = JSON.parse(processResult.stdout);
    } catch (error) {
      processResult.parseError = String(error);
    }
  }
  return {
    tool: 'ashiba-query-uses',
    kind,
    target,
    allowParserFallback,
    invocationCount: 1,
    exitCode: processResult.status ?? 1,
    wallMs: processResult.wallMs,
    report,
    stderr: processResult.stderr.trim(),
    parseError: processResult.parseError,
  };
}

function runRg(root, kind, target) {
  // This is intentionally an ordinary lexical control: a human supplies the
  // target's table or column token to rg, with no SQL parser or catalog model.
  const term = kind === 'table' ? 'accounts' : 'account_id';
  const processResult = runProcess('rg', ['-n', '-i', '--glob', '*.sql', term, root], REPO_ROOT);
  const files = new Set();
  if (processResult.status === 0) {
    for (const line of processResult.stdout.split(/\r?\n/).filter(Boolean)) {
      // rg prints `path:line:text`; greediness preserves the drive-letter colon.
      const match = line.match(/^(.*):\d+:/);
      if (match?.[1]) files.add(path.resolve(match[1]));
    }
  }
  return {
    tool: 'ordinary-rg',
    kind,
    target,
    lexicalTerm: term,
    invocationCount: 1,
    exitCode: processResult.status ?? 1,
    wallMs: processResult.wallMs,
    matchedFiles: [...files].sort(),
    matchedFileCount: files.size,
    stderr: processResult.stderr.trim(),
  };
}

function score(actualIds, truth, kind) {
  const expected = new Set(truth.filter((row) => row[kind]).map((row) => row.queryId));
  const actual = new Set(actualIds);
  const truePositives = [...actual].filter((id) => expected.has(id));
  const falsePositives = [...actual].filter((id) => !expected.has(id));
  const falseNegatives = [...expected].filter((id) => !actual.has(id));
  return {
    expectedCount: expected.size,
    actualCount: actual.size,
    truePositiveCount: truePositives.length,
    falsePositiveCount: falsePositives.length,
    falseNegativeCount: falseNegatives.length,
    completenessRecall: expected.size === 0 ? null : Number((truePositives.length / expected.size).toFixed(6)),
    precision: actual.size === 0 ? null : Number((truePositives.length / actual.size).toFixed(6)),
    truePositives,
    falsePositives,
    falseNegatives,
  };
}

function queryIds(report) {
  return report?.matches?.map((match) => match.query_id).filter(Boolean) ?? [];
}

function summarizeResult(result, truth, kind) {
  const expectedParserFailures = truth.filter((row) => row.parserFailure).map((row) => row.queryId);
  const out = { ...result };
  if (result.tool === 'ashiba-query-uses') {
    out.summary = result.report?.summary ?? null;
    if (result.report) {
      const ids = queryIds(result.report);
      const scored = score(ids, truth, kind);
      out.score = compactScore(scored);
      out.matchQueryIdSample = sampleIds(ids);
    } else {
      out.score = null;
    }
    // The command's complete JSON is intentionally not copied into the raw
    // benchmark record: IDs, summary, and score are the evidence needed for
    // this scale comparison, while full representatives make Large noisy.
    delete out.report;
    out.parserFailureBehavior = expectedParserFailures.length > 0
      ? { expectedQueryIds: expectedParserFailures, failClosed: result.exitCode !== 0 && /ASHIBA_QUERY_USES_AST_PARSE_FAILED/.test(result.stderr), observedErrorCode: result.stderr.match(/\[([A-Z0-9_]+)\]/)?.[1] ?? null }
      : null;
  } else {
    const ids = result.matchedFiles.map((file) => `${path.basename(file, '.sql')}:1`);
    out.score = compactScore(score(ids, truth, kind));
    out.matchedQueryIdSample = sampleIds(ids);
    delete out.matchedFiles;
  }
  return out;
}

function sampleIds(ids) {
  return ids.length <= 10 ? ids : [...ids.slice(0, 5), '…', ...ids.slice(-5)];
}

function compactScore(scored) {
  const { truePositives, falsePositives, falseNegatives, ...counts } = scored;
  return {
    ...counts,
    truePositiveSample: sampleIds(truePositives),
    falsePositiveSample: sampleIds(falsePositives),
    falseNegativeSample: sampleIds(falseNegatives),
  };
}

function benchmarkSize(size, count, includeParserFailure, keepFixtures) {
  const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), `ashiba-query-uses-${size}-`));
  const truth = writeFixture(fixtureRoot, count, includeParserFailure);
  const filesCreated = 1 + count * 2;
  const result = {
    size,
    sqlStatements: count,
    fixture: { root: keepFixtures ? fixtureRoot : '<temporary-and-removed>', filesCreated, manifest: 'manifest.json' },
    parserFailureFixture: includeParserFailure,
    methods: {
      ashiba: 'node packages/cli/dist/index.js query uses {table|column} ... --root-dir FIXTURE --format json',
      ordinaryRg: 'rg -n -i --glob "*.sql" {accounts|account_id} FIXTURE',
      groundTruth: 'Generated manifest truth flags; one SQL statement per catalog. Comments/string literals and near-name controls are negative truth rows.',
    },
    runs: {},
  };
  for (const [kind, target] of [['table', TARGET_TABLE], ['column', TARGET_COLUMN]]) {
    const ashiba = runAshiba(fixtureRoot, kind, target, false);
    const rg = runRg(fixtureRoot, kind, target);
    result.runs[kind] = {
      ashiba: summarizeResult(ashiba, truth, kind),
      ordinaryRg: summarizeResult(rg, truth, kind),
    };
    if (includeParserFailure) {
      result.runs[kind].ashibaFallback = summarizeResult(runAshiba(fixtureRoot, kind, target, true), truth, kind);
    }
  }
  if (!keepFixtures) rmSync(fixtureRoot, { recursive: true, force: true });
  else result.fixture.root = fixtureRoot;
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(CLI)) usage(`CLI build not found at ${CLI}; run: pnpm --filter @ashiba-ts/cli build`);
  const started = performance.now();
  const results = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    independentFreshAgentTool: { available: false, limitation: 'No independent fresh-agent runner is available inside this worker; ordinary rg is a scripted tools-only control.' },
    target: { table: TARGET_TABLE, column: TARGET_COLUMN },
    sizes: {},
    totalWallMs: null,
  };
  for (const size of args.sizes) results.sizes[size] = benchmarkSize(size, SIZES[size], args.includeParserFailure, args.keepFixtures);
  results.totalWallMs = Number((performance.now() - started).toFixed(3));
  const text = JSON.stringify(results, null, 2) + '\n';
  if (args.output) {
    mkdirSync(path.dirname(path.resolve(args.output)), { recursive: true });
    writeFileSync(path.resolve(args.output), text, 'utf8');
  } else {
    process.stdout.write(text);
  }
}

main();
