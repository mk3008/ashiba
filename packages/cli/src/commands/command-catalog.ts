import type { Command } from 'commander';

export interface CommandSpec { name: string; summary: string; useCase: string; usage: string; }

export const COMMANDS: readonly CommandSpec[] = [
  { name: 'check', summary: 'Run SQL safety checks.', useCase: 'Run the local SQL-oriented verification gate.', usage: 'ashiba check [options]' },
  { name: 'config', summary: 'Print an Ashiba config starter.', useCase: 'Configure SQL roots and dialect defaults.', usage: 'ashiba config' },
  { name: 'describe command', summary: 'Describe current Ashiba commands.', useCase: 'Discover the supported command surface.', usage: 'ashiba describe command [name...]' },
  { name: 'model-gen', summary: 'Generate deterministic binding metadata.', useCase: 'Lower canonical named SQL for native drivers at build time.', usage: 'ashiba model-gen <sqlFile> --out <file>' },
  { name: 'project check', summary: 'Run project-level SQL safety checks.', useCase: 'Check configured SQL roots without feature-layout ownership.', usage: 'ashiba project check' },
  { name: 'postgres-contract', summary: 'Derive a standalone PostgreSQL contract.', useCase: 'Optionally verify parameter/result contracts from real PostgreSQL.', usage: 'ashiba postgres-contract <write|check> <sqlFile>' },
  { name: 'ddl migration generate', summary: 'Generate reviewable SQL from DDL snapshots.', useCase: 'Review DDL changes without mutating a database.', usage: 'ashiba ddl migration generate --from <path> --to <path>' },
  { name: 'gate scaffold', summary: 'Scaffold passive local check gates.', useCase: 'Add an opt-in project check command or CI gate.', usage: 'ashiba gate scaffold' },
  { name: 'lint', summary: 'Lint SQL files.', useCase: 'Inspect visible SQL for analysis-safety issues.', usage: 'ashiba lint <path>' },
  { name: 'perf scenario init', summary: 'Create a performance scenario.', useCase: 'Record an explicit SQL performance measurement.', usage: 'ashiba perf scenario init' },
  { name: 'perf scenario measure', summary: 'Record a performance scenario measurement.', useCase: 'Keep measured evidence next to a scenario.', usage: 'ashiba perf scenario measure' },
  { name: 'perf report diff', summary: 'Compare performance reports.', useCase: 'Review an explicit performance delta.', usage: 'ashiba perf report diff' },
  { name: 'query uses table', summary: 'Find SQL table usage.', useCase: 'Inspect the impact of a table change.', usage: 'ashiba query uses table <table>' },
  { name: 'query uses column', summary: 'Find SQL column usage.', useCase: 'Inspect the impact of a column change.', usage: 'ashiba query uses column <column>' },
  { name: 'query outline', summary: 'Outline SQL structure.', useCase: 'Review query structure.', usage: 'ashiba query outline <sqlFile>' },
  { name: 'query graph', summary: 'Graph SQL relationships.', useCase: 'Inspect table and CTE relationships.', usage: 'ashiba query graph <sqlFile>' },
  { name: 'query slice', summary: 'Slice a query for review.', useCase: 'Create a bounded SQL review view.', usage: 'ashiba query slice <sqlFile>' },
  { name: 'query optional add', summary: 'Add an optional SQL condition.', useCase: 'Apply explicit optional-condition metadata.', usage: 'ashiba query optional add <sqlFile>' },
  { name: 'query optional refresh', summary: 'Refresh optional SQL conditions.', useCase: 'Reconcile optional-condition metadata.', usage: 'ashiba query optional refresh <sqlFile>' },
  { name: 'query optional remove', summary: 'Remove an optional SQL condition.', useCase: 'Remove explicit optional-condition metadata.', usage: 'ashiba query optional remove <sqlFile>' },
  { name: 'query format', summary: 'Format SQL.', useCase: 'Apply deterministic SQL formatting.', usage: 'ashiba query format <sqlFile>' },
  { name: 'query lint', summary: 'Lint a query.', useCase: 'Inspect one visible SQL query.', usage: 'ashiba query lint <sqlFile>' },
  { name: 'sql-resource snapshot', summary: 'Snapshot SQL resource metadata.', useCase: 'Record SQL resource identity.', usage: 'ashiba sql-resource snapshot <path>' },
  { name: 'sql-resource compare', summary: 'Compare SQL resource metadata.', useCase: 'Review SQL resource changes.', usage: 'ashiba sql-resource compare <path>' },
];

export function getCommandSpec(name: string): CommandSpec { const result = COMMANDS.find((entry) => entry.name === name); if (!result) throw new Error(`Ashiba command catalog entry is missing: ${name}`); return result; }
export function getCommandSummary(name: string): string { return getCommandSpec(name).summary.replace(/\.$/, ''); }
export function formatCommonUseCases(names: readonly string[]): string { return names.map((name) => { const item = getCommandSpec(name); return `  ${item.usage.padEnd(38)} ${item.useCase}`; }).join('\n'); }
export function applyCommandCatalogToProgram(program: Command): void { for (const spec of COMMANDS) { let current: Command | undefined = program; for (const part of spec.name.split(' ')) current = current?.commands.find((command) => command.name() === part); if (current) current.description(getCommandSummary(spec.name)); } }
export function formatCommandCatalogHelp(name: string): string { const item = getCommandSpec(name); return `\nCatalog use case:\n  ${item.useCase}\n`; }
