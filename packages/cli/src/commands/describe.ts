import type { Command } from 'commander';
import { COMMANDS, type CommandSpec } from './command-catalog.js';

export { COMMANDS };

export interface DescribeOptions {
  format?: 'text' | 'json';
}

export function registerDescribeCommand(program: Command): void {
  const describe = program.command('describe').description('Describe Ashiba commands for humans and AI agents');

  describe
    .command('command [name...]')
    .description('Describe one command or list the command catalog')
    .option('--format <format>', 'Output format: text or json', 'text')
    .action((nameParts: string[] | undefined, options: DescribeOptions) => {
      const name = (nameParts ?? []).join(' ').trim();
      const result = name ? COMMANDS.filter((command) => command.name === name) : [...COMMANDS];
      if (options.format === 'json') {
        process.stdout.write(`${JSON.stringify({ kind: 'describe-command', commands: result }, null, 2)}\n`);
        return;
      }
      process.stdout.write(formatDescribe(result));
    });
}

export function formatDescribe(commands: readonly CommandSpec[]): string {
  if (commands.length === 0) {
    return 'No command descriptor found.\n';
  }

  return `${[
    'Ashiba command catalog',
    ...commands.map(formatCommandSummary),
  ].join('\n')}\n`;
}

function formatCommandSummary(command: CommandSpec): string {
  return [
    `- ${command.name}: ${command.summary}`,
    `  usage: ${command.usage}`,
    `  use case: ${command.useCase}`,
  ].join('\n');
}
