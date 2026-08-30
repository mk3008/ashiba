import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const SECONDARY_PROTOCOL_VERSION = 'secondary-controls-v1';
export const SECONDARY_CONTROLS = Object.freeze(['AF-V', 'AF-L', 'X1', 'SD', 'E1']);
export const PRIMARY_ARMS = Object.freeze(['A', 'P', 'S', 'D', 'K', 'G']);
export const REQUIRED_EVIDENCE = Object.freeze([
  'packet-hashes',
  'candidate-source-manifest',
  'command-logs',
  'runner-result',
  'pre-cleanup-db-state',
  'cleanup-result',
  'treatment-review',
]);

export function validateSecondaryRunPlan(plan) {
  const issues = [];
  const has = (key, value) => Array.isArray(plan?.[key]) && plan[key].includes(value);
  if (plan?.protocolVersion !== SECONDARY_PROTOCOL_VERSION) issues.push('protocolVersion');
  for (const control of SECONDARY_CONTROLS) if (!has('controls', control)) issues.push(`controls:${control}`);
  for (const arm of PRIMARY_ARMS) if (!has('arms', arm)) issues.push(`arms:${arm}`);
  if (plan?.primaryPacketReadOnly !== true) issues.push('primaryPacketReadOnly');
  if (plan?.sharedRunnerReadOnly !== true) issues.push('sharedRunnerReadOnly');
  for (const key of ['freshDirectory', 'isolatedNpmCache', 'nonceSchemaAndRole', 'separateEvidenceDirectory']) {
    if (plan?.candidateIsolation?.[key] !== true) issues.push(`candidateIsolation:${key}`);
  }
  if (plan?.repairCap !== 2) issues.push('repairCap');
  if (plan?.resultAggregation !== 'none') issues.push('resultAggregation');
  for (const item of REQUIRED_EVIDENCE) if (!has('requiredEvidence', item)) issues.push(`requiredEvidence:${item}`);
  return { valid: issues.length === 0, issues };
}

async function main() {
  const args = process.argv.slice(2);
  const planPath = args[0] === '--validate' ? args[1] : undefined;
  if (!planPath) {
    console.error('Usage: node secondary-runner-api.mjs --validate <run-plan.json>');
    process.exitCode = 2;
    return;
  }
  const plan = JSON.parse(await readFile(resolve(planPath), 'utf8'));
  const result = validateSecondaryRunPlan(plan);
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
}

if (import.meta.url === new URL(`file://${process.argv[1]?.replaceAll('\\', '/')}`).href) await main();
