import { readFileSync } from 'node:fs';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';

function compile(file: string) {
  const sql = readFileSync(new URL(`../../sql/${file}.sql`, import.meta.url), 'utf8').replace(/\r\n?/g, '\n');
  return compileNamedParameters(sql, { rendering: { style: 'indexed', prefix: '$' } });
}

/** Application-owned startup cache compiled from the visible SQL files. */
export const queryBindings = {
  list: compile('list_tickets'),
  get: compile('get_ticket'),
  assign: compile('assign_ticket'),
  event: compile('insert_ticket_event'),
} as const;
