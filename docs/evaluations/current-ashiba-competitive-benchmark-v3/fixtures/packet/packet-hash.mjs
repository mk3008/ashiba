import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const packetRoot = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = dirname(packetRoot);
const excludedDirectories = new Set(['node_modules', 'evidence']);

async function walk(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const path = join(current, entry.name);
    if (entry.isDirectory()) files.push(...await walk(root, path));
    else files.push(path);
  }
  return files;
}

const files = (await walk(fixtureRoot)).sort();
const hashes = [];
for (const path of files) {
  const bytes = await readFile(path);
  hashes.push({ path: relative(fixtureRoot, path).replaceAll('\\', '/'), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length });
}
console.log(JSON.stringify({ status: 'P', fixtureRoot, files: hashes }, null, 2));
