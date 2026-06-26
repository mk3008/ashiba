import { spawnSync } from 'node:child_process';

const generatedPaths = [
  'docs/generated/transfer/transfer-docs.md',
  'docs/generated/transfer/authority',
  'docs/generated/transfer/scope',
  'docs/generated/transfer/testing',
  'docs/generated/transfer/technology',
  'docs/generated/transfer/review.md',
  'docs/generated/transfer/concepts',
  'docs/generated/transfer/dfd',
  'docs/generated/transfer/processes',
  'docs/generated/transfer/roles',
  'docs/generated/transfer/rawsql-transfer',
];

const trackedResult = spawnSync('git', ['ls-files', '--', ...generatedPaths], {
  encoding: 'utf8',
});

if (trackedResult.error) {
  console.error(trackedResult.error.message);
  process.exit(1);
}

if (trackedResult.status !== 0) {
  process.exit(1);
}

const trackedFiles = trackedResult.stdout
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

if (trackedFiles.length > 0) {
  console.error('Generated transfer docs must remain untracked source derivatives:');
  for (const file of trackedFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log('Generated transfer docs are source derivatives and are not tracked by git.');
