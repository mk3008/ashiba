import { createHash } from 'node:crypto';
import { mkdir, open, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const ARM = new Set(['A', 'P', 'S', 'D', 'K', 'G']);
export const IGNORE = new Set(['.git', '.pnpm', 'node_modules', 'dist', 'coverage']);

export function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function json(value) {
  return JSON.stringify(value, null, 2);
}

export async function writeJson(path, value) {
  const absolute = resolve(path);
  await mkdir(dirname(absolute), { recursive: true });
  const handle = await open(absolute, 'w');
  try {
    await handle.writeFile(`${json(value)}\n`);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function walk(root, current = root, entries = []) {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    const path = join(current, entry.name);
    if (entry.isDirectory()) await walk(root, path, entries);
    else if (entry.isFile()) {
      const buffer = await readFile(path);
      entries.push({ path: relative(root, path).replaceAll('\\', '/'), bytes: buffer.byteLength, sha256: sha(buffer) });
    }
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

export async function sourceTexts(root) {
  const texts = [];
  for (const entry of await walk(root)) {
    if (!/\.(?:[cm]?[jt]sx?|sql|json|md|ya?ml)$/i.test(entry.path)) continue;
    const path = join(root, entry.path);
    texts.push({ path: entry.path, text: await readFile(path, 'utf8') });
  }
  return texts;
}

export async function staticIsolationCheck(root, extra = []) {
  const findings = [];
  for (const file of await sourceTexts(root)) {
    if (/\b(?:from|join|update|into|delete\s+from)\s+public\b/i.test(file.text)) findings.push({ id: 'public-schema', path: file.path });
    if (/ashiba[-\s]*(?:cli|model-gen)|@ashiba-ts\/cli/i.test(file.text)) findings.push({ id: 'removed-ashiba-surface', path: file.path });
    // Secondary Arm A receives the frozen packed artifact through a sibling
    // `artifacts/` directory. That fixed tarball reference is not a workspace
    // link. Keep rejecting every other relative Ashiba file reference as a
    // potential repository leak.
    const withoutPermittedTarball = file.text.replaceAll(
      'file:../artifacts/ashiba-ts-named-parameters-0.1.0.tgz',
      'permitted-packed-artifact',
    );
    if (/file:\.{2}(?:[\\/].*)?ashiba/i.test(withoutPermittedTarball) || /worktrees[\\/]|github[\\/]ashiba/i.test(file.text)) findings.push({ id: 'workspace-reference', path: file.path });
    for (const rule of extra) if (rule.pattern.test(file.text)) findings.push({ id: rule.id, path: file.path });
  }
  return { pass: findings.length === 0, findings };
}

export async function importCandidate(entry) {
  const module = await import(`${pathToFileURL(resolve(entry)).href}?runner=${Date.now()}`);
  return module;
}

export function errorValue(error) {
  return { name: error?.name ?? 'Error', code: typeof error?.code === 'string' ? error.code : undefined, message: error instanceof Error ? error.message : String(error) };
}

export async function fileExists(path) {
  try { return (await stat(path)).isFile(); } catch { return false; }
}
