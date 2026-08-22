import { resolve } from 'node:path';
import { runReferenceControls } from '../reference-oracle.mjs';
const outputPath = process.argv[2] ? resolve(process.argv[2]) : resolve('tmp/competitive-benchmark-v2-followup-t1-t2-reference-replay.json');
const record = await runReferenceControls({ databaseUrl: process.env.DATABASE_URL, workloads: ['T1', 'T2'], outputPath });
console.log(JSON.stringify({ status: record.status, checks: record.checks, cleanup: record.cleanup, record: outputPath }));
if (record.status !== 'P') process.exitCode = 1;
