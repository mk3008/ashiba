import { readFileSync } from 'node:fs';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';

function compile(file: string) {
  const sql = readFileSync(new URL(`./tickets/${file}.sql`, import.meta.url), 'utf8').replace(/\r\n?/g, '\n');
  return compileNamedParameters(sql, { rendering: { style: 'indexed', prefix: '$' } });
}

/** Application-owned startup cache compiled from the visible canonical SQL files. */
export const queries = {
  list: compile('list'),
  get: compile('get'),
  assign: compile('assign'),
  audit: compile('audit'),
} as const;
