import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { json, sha, walk } from '../common.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const EVALUATION = resolve(HERE, '..', '..', '..');
const CELL = /^SD-(A|P|S|D|K|G)-r1$/;

function parseArgs(args) {
  const value = (name) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
  return { cell: value('--cell'), snapshot: value('--snapshot'), destination: value('--destination') };
}

export async function materializeSdCell({ cell, snapshot, destination }) {
  const match = CELL.exec(cell ?? '');
  if (!match) throw new Error('cell must be SD × A|P|S|D|K|G × r1');
  if (!snapshot || !destination) throw new Error('--snapshot and --destination are required');
  const source = resolve(snapshot); const absolute = resolve(destination);
  if (absolute.startsWith(EVALUATION)) throw new Error('destination must be outside repository evaluation tree');
  const candidateRoot = join(absolute, 'candidate'); const packetRoot = join(absolute, 'packet'); const evidenceRoot = join(absolute, 'evidence');
  await rm(absolute, { recursive: true, force: true });
  await Promise.all([mkdir(candidateRoot, { recursive: true }), mkdir(packetRoot, { recursive: true }), mkdir(evidenceRoot, { recursive: true })]);
  await cp(source, candidateRoot, { recursive: true, filter: (path) => !/node_modules|\.git(?:\\|\/|$)/i.test(path) });
  const files = await walk(candidateRoot);
  const manifest = { cell, control: 'SD', arm: match[1], sourceSnapshot: source, files, sha256: sha(json(files)) };
  await writeFile(join(absolute, 'baseline-source-manifest.json'), `${json(manifest)}\n`);
  for (const file of ['PREREGISTRATION.md', 'RUNNER_API.md']) await cp(join(HERE, file), join(packetRoot, file));
  await writeFile(join(packetRoot, 'CELL.json'), `${JSON.stringify({ cell, control: 'SD', arm: match[1], replicate: 1, protocol: 'secondary-controls-v1', baselineSourceManifest: '../baseline-source-manifest.json' }, null, 2)}\n`);
  return { cell, arm: match[1], source, candidateRoot, packetRoot, evidenceRoot, baselineSourceManifest: join(absolute, 'baseline-source-manifest.json') };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) console.log(JSON.stringify(await materializeSdCell(parseArgs(process.argv.slice(2))), null, 2));
