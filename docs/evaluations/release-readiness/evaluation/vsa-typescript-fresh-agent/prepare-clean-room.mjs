import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const cleanRoom = mkdtempSync(path.join(tmpdir(), 'ashiba-vsa-typescript-clean-room-'));
const tarballs = path.join(cleanRoom, 'tarballs');
const input = path.join(cleanRoom, 'input');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const env = {
  ...process.env,
  npm_config_cache: path.join(cleanRoom, 'npm-cache'),
  npm_config_fund: 'false',
  npm_config_audit: 'false',
};

mkdirSync(tarballs, { recursive: true });
mkdirSync(input, { recursive: true });

const namedManifest = JSON.parse(readFileSync(path.join(root, 'packages', 'named-parameters', 'package.json'), 'utf8'));
for (const packageDir of ['named-parameters', 'cli']) {
  const source = path.join(root, 'packages', packageDir);
  const staging = path.join(cleanRoom, 'staging', packageDir);
  mkdirSync(staging, { recursive: true });
  cpSync(path.join(source, 'dist'), path.join(staging, 'dist'), { recursive: true });
  cpSync(path.join(source, 'README.md'), path.join(staging, 'README.md'));
  const manifest = JSON.parse(readFileSync(path.join(source, 'package.json'), 'utf8'));
  if (packageDir === 'cli') manifest.dependencies['@ashiba-ts/named-parameters'] = `^${namedManifest.version}`;
  writeFileSync(path.join(staging, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  execFileSync(npm, ['pack', '--json', '--ignore-scripts', '--pack-destination', tarballs], {
    cwd: staging,
    env,
    stdio: 'pipe',
    shell: process.platform === 'win32',
  });
}

for (const file of ['AGENTS.md', 'BUSINESS_ACCEPTANCE.md', 'FRESH_AGENT_HARNESS_PROMPT.txt', 'ORIGINAL_PROMPT.md', 'schema.sql']) {
  cpSync(path.join(path.dirname(fileURLToPath(import.meta.url)), file), path.join(input, file));
}

console.log(JSON.stringify({ cleanRoom, tarballs, input }, null, 2));
