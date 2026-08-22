import { resolve } from 'node:path';
import { runReferenceControls } from '../evaluator/reference-oracle.mjs';
const outputPath = process.argv[2] ? resolve(process.argv[2]) : resolve('tmp/competitive-benchmark-v2-followup-reference-replay.json');
const record = await runReferenceControls({ databaseUrl: process.env.DATABASE_URL, outputPath });
console.log(JSON.stringify({ status: record.status, checks: Object.fromEntries(Object.entries(record.checks).map(([id, result]) => [id, result.status])), cleanup: record.cleanup.status, record: outputPath }));
if (record.status !== 'P') process.exitCode = 1;
