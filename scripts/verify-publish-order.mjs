import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plan = JSON.parse(execFileSync(process.execPath, ['scripts/publish-in-dependency-order.mjs', '--plan'], {
  cwd: repoRoot,
  encoding: 'utf8',
}));
const packageByName = new Map(plan.packages.map((entry) => [entry.name, entry]));

for (const entry of plan.packages) {
  for (const dependencyName of entry.internalDependencies) {
    const dependency = packageByName.get(dependencyName);
    if (!dependency || dependency.order >= entry.order) {
      throw new Error(`Publish order is not dependency-first: ${entry.name} depends on ${dependencyName}.`);
    }
  }
}

const namedParameters = packageByName.get('@ashiba-ts/named-parameters');
if (!namedParameters) {
  throw new Error('Expected @ashiba-ts/named-parameters in the public publish plan.');
}

console.log(`publish-order verification passed: ${plan.packages.length} public packages, ${[...plan.packages].flatMap((entry) => entry.internalDependencies).length} internal dependency edges.`);
