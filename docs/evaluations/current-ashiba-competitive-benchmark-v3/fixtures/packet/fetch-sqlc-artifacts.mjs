import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { access, mkdir, readFile, rename, rm } from 'node:fs/promises';
import { basename, resolve, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const ARTIFACTS = Object.freeze([
  {
    name: 'sqlc_1.31.1_windows_amd64.zip',
    url: 'https://downloads.sqlc.dev/sqlc_1.31.1_windows_amd64.zip',
    sha256: '352711fa7dcb05dcdfefca0ad71b2c9a74fd090f8d7fc609419de4cbc725429f',
  },
  {
    name: 'sqlc-gen-typescript_0.1.3.wasm',
    url: 'https://downloads.sqlc.dev/plugin/sqlc-gen-typescript_0.1.3.wasm',
    sha256: '287df8f6cc06377d67ad5ba02c9e0f00c585509881434d15ea8bd9fc751a9368',
  },
]);

function outputDirectory() {
  const index = process.argv.indexOf('--out');
  if (index === -1 || !process.argv[index + 1]) {
    throw new Error('usage: node fetch-sqlc-artifacts.mjs --out <directory>');
  }
  return resolve(process.argv[index + 1]);
}

async function digest(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function download(url, destination) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok || !response.body) throw new Error(`download failed (${response.status}): ${url}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination, { flags: 'wx' }));
}

const out = outputDirectory();
await mkdir(out, { recursive: true });
const results = [];
for (const artifact of ARTIFACTS) {
  const destination = join(out, basename(artifact.name));
  const temporary = `${destination}.partial`;
  let observed;
  try {
    await access(destination);
    observed = await digest(destination);
    if (observed !== artifact.sha256) throw new Error(`existing artifact digest mismatch: ${artifact.name}`);
    results.push({ name: artifact.name, status: 'verified-existing', sha256: observed });
    continue;
  } catch (error) {
    if (error.message.startsWith('existing artifact digest mismatch')) throw error;
  }
  await rm(temporary, { force: true });
  try {
    await download(artifact.url, temporary);
    observed = await digest(temporary);
    if (observed !== artifact.sha256) throw new Error(`downloaded artifact digest mismatch: ${artifact.name}`);
    await rename(temporary, destination);
    results.push({ name: artifact.name, status: 'downloaded-and-verified', sha256: observed });
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}
console.log(JSON.stringify({ status: 'PASS', artifacts: results }, null, 2));
