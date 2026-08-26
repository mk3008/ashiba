import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const publishTag = resolvePublishTag(process.argv.slice(2));
const shouldTagGit = !process.argv.includes('--no-git-tag');

// `changeset version` remains responsible for calculating and writing versions.
// This command owns only the publication phase that the GitHub publish workflow
// invokes. Changesets currently starts independent package publishes concurrently;
// publishing this graph one package at a time preserves registry dependency closure.
const workspacePackages = JSON.parse(run(pnpm, ['-r', 'list', '--depth', '-1', '--json']));
const publicPackages = workspacePackages
  .filter((workspacePackage) => workspacePackage.private === false)
  .map((workspacePackage) => ({
    ...workspacePackage,
    packageJson: JSON.parse(readFileSync(path.join(workspacePackage.path, 'package.json'), 'utf8')),
  }));

const packagesByName = new Map(publicPackages.map((workspacePackage) => [workspacePackage.name, workspacePackage]));
const publishOrder = dependencyFirstOrder(packagesByName);
const plan = publishOrder.map((packageName, index) => ({
  name: packageName,
  version: packagesByName.get(packageName).version,
  internalDependencies: internalPublicDependencies(packagesByName.get(packageName).packageJson, packagesByName),
  order: index,
}));

if (process.argv.includes('--plan')) {
  console.log(JSON.stringify({ packages: plan }, null, 2));
  process.exit(0);
}

const published = [];

try {
  for (const packageName of publishOrder) {
    const workspacePackage = packagesByName.get(packageName);
    if (isPublished(workspacePackage)) {
      console.log(`Skipping already-published ${packageName}@${workspacePackage.version}`);
      continue;
    }

    console.log(`Publishing ${packageName}@${workspacePackage.version}`);
    // Keep the publish tool that Changesets selects for this pnpm workspace. In
    // particular, pnpm converts workspace protocol dependencies in the packed
    // manifest; npm publish from the source directory does not.
    execFileSync(pnpm, ['publish', '--no-git-checks', '--access', 'public', '--tag', publishTag, ...registryArgs(workspacePackage.packageJson)], {
      cwd: workspacePackage.path,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    published.push(workspacePackage);
  }
} finally {
  if (shouldTagGit) {
    for (const workspacePackage of published) {
      const tag = `${workspacePackage.name}@${workspacePackage.version}`;
      if (tagExists(tag)) {
        continue;
      }
      execFileSync('git', ['tag', tag], { cwd: repoRoot, stdio: 'inherit' });
    }
  }
}

console.log(`Dependency-ordered publish complete: ${published.length} package(s) published.`);

function dependencyFirstOrder(packages) {
  const remainingDependencies = new Map();
  const dependents = new Map([...packages.keys()].map((packageName) => [packageName, []]));

  for (const [packageName, workspacePackage] of packages) {
    const dependencies = internalPublicDependencies(workspacePackage.packageJson, packages);
    remainingDependencies.set(packageName, new Set(dependencies));
    for (const dependency of dependencies) {
      dependents.get(dependency).push(packageName);
    }
  }

  const ready = [...packages.keys()]
    .filter((packageName) => remainingDependencies.get(packageName).size === 0)
    .sort((left, right) => left.localeCompare(right));
  const ordered = [];

  while (ready.length > 0) {
    const packageName = ready.shift();
    ordered.push(packageName);

    for (const dependent of dependents.get(packageName).sort((left, right) => left.localeCompare(right))) {
      const dependencies = remainingDependencies.get(dependent);
      dependencies.delete(packageName);
      if (dependencies.size === 0) {
        ready.push(dependent);
        ready.sort((left, right) => left.localeCompare(right));
      }
    }
  }

  if (ordered.length !== packages.size) {
    const cycle = [...packages.keys()].filter((packageName) => !ordered.includes(packageName));
    throw new Error(`Cannot publish an internal dependency cycle: ${cycle.join(', ')}`);
  }

  return ordered;
}

function internalPublicDependencies(packageJson, packages) {
  const dependencySections = [
    packageJson.dependencies,
    packageJson.optionalDependencies,
    packageJson.peerDependencies,
  ];
  return [...new Set(dependencySections.flatMap((dependencies) => Object.keys(dependencies ?? {})))]
    .filter((dependencyName) => packages.has(dependencyName))
    .sort((left, right) => left.localeCompare(right));
}

function isPublished(workspacePackage) {
  const result = spawnSync(npm, ['view', `${workspacePackage.name}@${workspacePackage.version}`, 'version', '--json', ...registryArgs(workspacePackage.packageJson)], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.status === 0) {
    return true;
  }
  if (`${result.stdout}\n${result.stderr}`.includes('E404')) {
    return false;
  }
  throw new Error(`Could not determine whether ${workspacePackage.name}@${workspacePackage.version} is published:\n${result.stderr || result.stdout}`);
}

function registryArgs(packageJson) {
  const scope = packageJson.name.startsWith('@') ? packageJson.name.split('/')[0] : undefined;
  const registry = packageJson.publishConfig?.[`${scope}:registry`] ?? packageJson.publishConfig?.registry;
  return registry ? ['--registry', registry] : [];
}

function tagExists(tag) {
  return spawnSync('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`], {
    cwd: repoRoot,
    stdio: 'ignore',
  }).status === 0;
}

function resolvePublishTag(args) {
  const inlineTag = args.find((arg) => arg.startsWith('--tag='));
  let customTag;
  if (inlineTag) {
    customTag = inlineTag.slice('--tag='.length);
  }
  const tagIndex = args.indexOf('--tag');
  if (!customTag && tagIndex !== -1 && args[tagIndex + 1]) {
    customTag = args[tagIndex + 1];
  }

  const preStatePath = path.join(repoRoot, '.changeset', 'pre.json');
  try {
    const preState = JSON.parse(readFileSync(preStatePath, 'utf8'));
    if (preState.mode === 'pre' && typeof preState.tag === 'string' && preState.tag.length > 0) {
      if (customTag) {
        throw new Error('Publishing under a custom tag is not allowed in Changesets pre mode.');
      }
      return preState.tag;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  return customTag ?? 'latest';
}

function run(command, args) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
}
