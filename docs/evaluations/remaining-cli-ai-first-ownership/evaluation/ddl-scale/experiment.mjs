#!/usr/bin/env node

/**
 * Reproducible DDL organization experiment.
 *
 * It creates the same PostgreSQL-like schema in one pg_dump-shaped file and in
 * one file per table, then uses ordinary `rg` and filesystem reads to extract
 * public.orders.status. The fixture is temporary and deterministic; only the
 * JSON result is kept in this evaluation directory.
 */

import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const TABLE_COUNT = 600;
const TARGET_TABLE = 'orders';
const TARGET_COLUMN = 'status';
const TARGET_TYPE = 'text';
const ITERATIONS = Number.parseInt(process.env.DDL_SCALE_ITERATIONS ?? '5', 10);
const OUTPUT_PATH = resolve(fileURLToPath(new URL('.', import.meta.url)), 'raw-results.json');

if (!Number.isInteger(ITERATIONS) || ITERATIONS < 1 || ITERATIONS > 100) {
  throw new Error('DDL_SCALE_ITERATIONS must be an integer from 1 through 100');
}

function tableName(index) {
  if (index === 0) return TARGET_TABLE;
  if (index === 1) return 'orders_archive';
  if (index === 2) return 'orders_status_shadow';
  return `tenant_${String(index).padStart(4, '0')}_records`;
}

function tableBody(name, index) {
  const target = name === TARGET_TABLE;
  const constraintName = `${name}_pkey`;
  const safeName = name.replaceAll('-', '_');
  const columns = target
    ? [
        '  id bigint NOT NULL,',
        '  customer_id bigint NOT NULL,',
        '  owner_id bigint,',
        '  status text NOT NULL,',
        '  source text NOT NULL DEFAULT \'web\'::text,',
        '  placed_at timestamp with time zone NOT NULL,',
        '  total_cents integer NOT NULL,',
        '  metadata jsonb NOT NULL DEFAULT \'{}\'::jsonb,',
      ]
    : [
        '  id bigint NOT NULL,',
        '  status text NOT NULL,',
        '  label text,',
        '  owner_id bigint,',
        '  created_at timestamp with time zone NOT NULL,',
        '  updated_at timestamp with time zone NOT NULL,',
        '  metadata jsonb NOT NULL DEFAULT \'{}\'::jsonb,',
      ];

  return [
    `-- unit ${String(index).padStart(4, '0')}: ${name}`,
    `-- False candidates are intentional: the prose mentions CREATE TABLE public.${TARGET_TABLE} ( and ${TARGET_COLUMN}.`,
    `-- This is documentation only; it must not be treated as a declaration for ${TARGET_TABLE}.`,
    `CREATE TABLE public.${name} (`,
    ...columns,
    `  CONSTRAINT ${constraintName} PRIMARY KEY (id)`,
    ');',
    '',
    `ALTER TABLE ONLY public.${name} ADD CONSTRAINT ${safeName}_owner_fk`,
    '  FOREIGN KEY (owner_id) REFERENCES public.owners(id);',
    `CREATE INDEX ${safeName}_status_idx ON public.${name} USING btree (status);`,
    `CREATE INDEX ${safeName}_created_idx ON public.${name} (created_at);`,
    `COMMENT ON TABLE public.${name} IS 'Owned by the ${target ? 'order' : 'record'} service; status is not a lifecycle command';`,
    `COMMENT ON COLUMN public.${name}.status IS 'A value such as ''pending'' or ''shipped''; strings are not identifiers';`,
    `-- Literal-looking SQL: 'CREATE TABLE public.${TARGET_TABLE} (' and '${TARGET_COLUMN} text' are examples in a note.`,
    '',
  ].join('\n');
}

function buildFixture() {
  const tableUnits = [];
  for (let index = 0; index < TABLE_COUNT; index += 1) {
    const name = tableName(index);
    tableUnits.push({ name, text: tableBody(name, index) });
  }

  const dump = [
    '-- PostgreSQL database dump (deterministic fixture; not a production dump)',
    '-- The comments and string literals below deliberately contain false candidates.',
    'SET statement_timeout = 0;',
    'SET lock_timeout = 0;',
    'SET client_encoding = \'UTF8\';',
    'CREATE SCHEMA public;',
    '',
    ...tableUnits.map((unit) => unit.text),
    '-- pg_dump footer',
    'REVOKE ALL ON SCHEMA public FROM PUBLIC;',
    '',
  ].join('\n');

  return { tableUnits, dump };
}

function lineCount(text) {
  if (text.length === 0) return 0;
  const lines = text.split(/\r?\n/);
  return lines.at(-1) === '' ? lines.length - 1 : lines.length;
}

function fileMetrics(filePath) {
  const bytes = readFileSync(filePath);
  const text = bytes.toString('utf8');
  return { bytes: bytes.byteLength, lines: lineCount(text) };
}

function sumMetrics(files) {
  return files.reduce(
    (total, file) => {
      const metrics = fileMetrics(file);
      return { bytes: total.bytes + metrics.bytes, lines: total.lines + metrics.lines };
    },
    { bytes: 0, lines: 0 },
  );
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function runRg(args, scannedFiles, counters) {
  const started = performance.now();
  const result = spawnSync('rg', args, { encoding: 'utf8', windowsHide: true });
  counters.toolCalls += 1;
  if (result.error) throw new Error(`rg could not be started: ${result.error.message}`);
  if (result.status > 1) {
    throw new Error(`rg failed with status ${result.status}: ${result.stderr.trim()}`);
  }
  const scanned = sumMetrics(scannedFiles);
  return {
    output: result.stdout,
    elapsedMs: performance.now() - started,
    scannedBytes: scanned.bytes,
    scannedLines: scanned.lines,
  };
}

function parseRgLines(output) {
  return output
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(':');
      return { lineNumber: Number.parseInt(line.slice(0, separator), 10), text: line.slice(separator + 1) };
    });
}

function readAndExtract(filePath, declarationLine, counters) {
  const started = performance.now();
  const buffer = readFileSync(filePath);
  const text = buffer.toString('utf8');
  counters.fsReads += 1;
  counters.fsBytes += buffer.byteLength;
  counters.fsLines += lineCount(text);
  const lines = text.split(/\r?\n/);
  const declaration = lines[declarationLine - 1] ?? '';
  const declarationMatch = declaration.match(/^CREATE TABLE public\.([a-z0-9_]+) \($/);
  if (!declarationMatch) throw new Error(`unexpected declaration at line ${declarationLine}`);
  const endIndex = lines.findIndex((line, index) => index >= declarationLine && line === ');');
  const columnIndex = lines.findIndex(
    (line, index) => index >= declarationLine && index < endIndex && new RegExp(`^  ${TARGET_COLUMN} ([a-z]+)`).test(line),
  );
  return {
    table: declarationMatch[1],
    column: columnIndex >= 0 ? TARGET_COLUMN : null,
    type: columnIndex >= 0 ? lines[columnIndex].match(new RegExp(`^  ${TARGET_COLUMN} ([a-z]+)`))[1] : null,
    declarationLine,
    columnLine: columnIndex >= 0 ? columnIndex + 1 : null,
    elapsedMs: performance.now() - started,
  };
}

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), 'ashiba-ddl-scale-'));
  const splitRoot = join(root, 'tables');
  mkdirSync(splitRoot);
  const fixture = buildFixture();
  const dumpPath = join(root, 'dump.sql');
  writeFileSync(dumpPath, fixture.dump, 'utf8');
  const splitPaths = [];
  for (const unit of fixture.tableUnits) {
    const filePath = join(splitRoot, `public.${unit.name}.sql`);
    writeFileSync(filePath, unit.text, 'utf8');
    splitPaths.push(filePath);
  }
  return { root, splitRoot, dumpPath, splitPaths, fixture };
}

function extractTargeted(layout, fixtureRoot, expected) {
  const counters = { toolCalls: 0, fsReads: 0, fsBytes: 0, fsLines: 0 };
  const started = performance.now();
  let targetPath;
  let declarationLine;
  let listingBytes = 0;
  let listingLines = 0;
  let rgBytes = 0;
  let rgLines = 0;
  let rgElapsedMs = 0;

  if (layout.kind === 'split') {
    const listing = runRg(['--files', '--glob', '*.sql', layout.root], [], counters);
    listingBytes = Buffer.byteLength(listing.output, 'utf8');
    listingLines = lineCount(listing.output);
    const relativeTarget = listing.output
      .split(/\r?\n/)
      .map((path) => path.trim())
      .find((path) => path.replaceAll('\\', '/').endsWith(`/public.${TARGET_TABLE}.sql`));
    if (!relativeTarget) throw new Error('target table file was not found by rg --files');
    targetPath = resolve(relativeTarget);
    const declarationSearch = runRg(
      ['--line-number', '--no-heading', '--color', 'never', `^CREATE TABLE public\\.${TARGET_TABLE} \\($`, targetPath],
      [targetPath],
      counters,
    );
    rgBytes += declarationSearch.scannedBytes;
    rgLines += declarationSearch.scannedLines;
    rgElapsedMs += declarationSearch.elapsedMs;
    declarationLine = parseRgLines(declarationSearch.output)[0]?.lineNumber;
  } else {
    targetPath = layout.root;
    const declarationSearch = runRg(
      ['--line-number', '--no-heading', '--color', 'never', `^CREATE TABLE public\\.${TARGET_TABLE} \\($`, targetPath],
      [targetPath],
      counters,
    );
    rgBytes += declarationSearch.scannedBytes;
    rgLines += declarationSearch.scannedLines;
    rgElapsedMs += declarationSearch.elapsedMs;
    declarationLine = parseRgLines(declarationSearch.output)[0]?.lineNumber;
  }

  if (!declarationLine) throw new Error('target table declaration was not found');
  const parsed = readAndExtract(targetPath, declarationLine, counters);
  const columnSearch = runRg(
    ['--line-number', '--no-heading', '--color', 'never', `^  ${TARGET_COLUMN} `, targetPath],
    [targetPath],
    counters,
  );
  rgBytes += columnSearch.scannedBytes;
  rgLines += columnSearch.scannedLines;
  rgElapsedMs += columnSearch.elapsedMs;
  const correctness = parsed.table === expected.table && parsed.column === expected.column && parsed.type === expected.type;
  return {
    elapsedMs: performance.now() - started,
    toolCalls: counters.toolCalls,
    fsReads: counters.fsReads,
    fsBytes: counters.fsBytes,
    fsLines: counters.fsLines,
    rgBytes,
    rgLines,
    rgElapsedMs,
    listingBytes,
    listingLines,
    relevantBytesExamined: rgBytes + counters.fsBytes,
    relevantLinesExamined: rgLines + counters.fsLines,
    extracted: parsed,
    correctness,
    targetPath: relative(fixtureRoot, targetPath).replaceAll('\\', '/'),
  };
}

function extractByRecursiveSearch(layout, expected) {
  const counters = { toolCalls: 0, fsReads: 0, fsBytes: 0, fsLines: 0 };
  const started = performance.now();
  const files = layout.files;
  const tableSearch = runRg(
    ['--line-number', '--no-heading', '--no-filename', '--color', 'never', `CREATE TABLE public\\.${TARGET_TABLE} \\(`, layout.root],
    files,
    counters,
  );
  const columnSearch = runRg(
    ['--line-number', '--no-heading', '--no-filename', '--color', 'never', `^  ${TARGET_COLUMN} `, layout.root],
    files,
    counters,
  );
  const declarationMatches = parseRgLines(tableSearch.output).filter((match) => /^CREATE TABLE public\.orders \($/.test(match.text));
  const columnMatches = parseRgLines(columnSearch.output).filter((match) => /^  status text/.test(match.text));
  const correctness = declarationMatches.length >= 1 && columnMatches.length >= 1;
  const rgBytes = tableSearch.scannedBytes + columnSearch.scannedBytes;
  const rgLines = tableSearch.scannedLines + columnSearch.scannedLines;
  return {
    elapsedMs: performance.now() - started,
    toolCalls: counters.toolCalls,
    fsReads: 0,
    fsBytes: 0,
    fsLines: 0,
    rgBytes,
    rgLines,
    relevantBytesExamined: rgBytes,
    relevantLinesExamined: rgLines,
    declarationMatches: declarationMatches.length,
    columnMatches: columnMatches.length,
    expected,
    correctness,
  };
}

function summarize(samples) {
  const numericKeys = [
    'elapsedMs',
    'toolCalls',
    'fsReads',
    'fsBytes',
    'fsLines',
    'rgBytes',
    'rgLines',
    'listingBytes',
    'listingLines',
    'relevantBytesExamined',
    'relevantLinesExamined',
  ];
  const summary = { runs: samples, runsCount: samples.length };
  for (const key of numericKeys) {
    const values = samples.map((sample) => sample[key] ?? 0);
    const sorted = [...values].sort((a, b) => a - b);
    summary[key] = {
      min: Math.min(...values),
      median: sorted[Math.floor(sorted.length / 2)],
      max: Math.max(...values),
      total: values.reduce((sum, value) => sum + value, 0),
    };
  }
  summary.correctness = samples.every((sample) => sample.correctness);
  return summary;
}

function main() {
  const { root, splitRoot, dumpPath, splitPaths, fixture } = createFixture();
  const dumpMetrics = fileMetrics(dumpPath);
  const splitMetrics = sumMetrics(splitPaths);
  const expected = { table: TARGET_TABLE, column: TARGET_COLUMN, type: TARGET_TYPE };
  const dumpLayout = { kind: 'dump', root: dumpPath, files: [dumpPath] };
  const splitLayout = { kind: 'split', root: splitRoot, files: splitPaths };
  const targeted = {
    dump: summarize(Array.from({ length: ITERATIONS }, () => extractTargeted(dumpLayout, root, expected))),
    split: summarize(Array.from({ length: ITERATIONS }, () => extractTargeted(splitLayout, root, expected))),
  };
  const recursiveSearch = {
    dump: summarize(Array.from({ length: ITERATIONS }, () => extractByRecursiveSearch(dumpLayout, expected))),
    split: summarize(Array.from({ length: ITERATIONS }, () => extractByRecursiveSearch(splitLayout, expected))),
  };

  const result = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    fixture: {
      tableCount: TABLE_COUNT,
      target: expected,
      dump: { files: 1, ...dumpMetrics, sha256: sha256(fixture.dump) },
      split: { files: splitPaths.length, ...splitMetrics, sha256: sha256(splitPaths.map((path) => readFileSync(path)).join('')) },
      falseCandidateCoverage: [
        'comment containing CREATE TABLE public.orders (',
        'string literal containing public.orders and status',
        'non-target tables orders_archive and orders_status_shadow',
        'status columns on every non-target table',
      ],
    },
    method: {
      command: 'rg --line-number --no-heading --color never plus Node.js filesystem reads',
      iterations: ITERATIONS,
      relevantBytesExamined: 'sum of bytes in every file content scope passed to rg plus bytes read by the extraction parser; rg --files listing bytes are reported separately',
      relevantLinesExamined: 'sum of lines in every file content scope passed to rg plus lines read by the extraction parser; directory listing lines are reported separately',
      toolCalls: 'count of rg process invocations per run; filesystem reads are counted separately',
      elapsed: 'wall-clock milliseconds around each extraction run on the local machine; not a token or credit measure',
    },
    scenarios: { targeted, recursiveSearch },
    maintenanceTradeoffs: {
      splitStorageOverheadRatio: splitMetrics.bytes / dumpMetrics.bytes,
      splitFileCountIncrease: splitPaths.length - 1,
      observations: [
        'Table-separated files make a known table path a small locality unit: targeted rg and parser reads touch only that file, plus a directory listing.',
        'A recursive content search without path knowledge scans all split files, so organization alone does not reduce bytes examined; a naming convention or index is the enabling maintenance convention.',
        'The single dump has lower file-count and header overhead and is convenient for ordered replay; a split tree increases rename/move and consistency-management surface.',
        'The fixture keeps the same table bodies and includes comments, literals, similarly named tables, and repeated status columns to test false-candidate handling.',
      ],
    },
  };
  if (!targeted.dump.correctness || !targeted.split.correctness || !recursiveSearch.dump.correctness || !recursiveSearch.split.correctness) {
    throw new Error('correctness check failed; inspect generated raw results');
  }
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ output: OUTPUT_PATH, fixtureRoot: root, dumpMetrics, splitMetrics, targeted: { dump: targeted.dump.relevantBytesExamined, split: targeted.split.relevantBytesExamined }, recursiveSearch: { dump: recursiveSearch.dump.relevantBytesExamined, split: recursiveSearch.split.relevantBytesExamined } }, null, 2));
}

main();
