import { rm } from 'node:fs/promises';
import path from 'node:path';

const workspaceRoot = process.cwd();
const generatedTransferDocs = path.join(workspaceRoot, 'docs', 'generated', 'transfer');

await rm(generatedTransferDocs, { recursive: true, force: true });
console.log('[docs] Removed stale generated Transfer pages from the Ashiba product docs build.');
