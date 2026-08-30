import { readFileSync } from 'node:fs';
import { compileNamedParameters } from '@ashiba-ts/named-parameters/compiler';

function compile(file: string) {
  const sql = readFileSync(new URL(`./${file}.sql`, import.meta.url), 'utf8').replace(/\r\n?/g, '\n');
  return compileNamedParameters(sql, { rendering: { style: 'indexed', prefix: '$' } });
}

/** Application-owned startup cache for the visible SQL in this ticket slice. */
export const queryBindings = {
  assign: compile('assign-ticket'),
  close: compile('close-ticket'),
  get: compile('get'),
  event: compile('insert-assignment-event'),
  createdAsc: compile('list-createdAt-asc'),
  createdDesc: compile('list-createdAt-desc'),
  subjectAsc: compile('list-subject-asc'),
  subjectDesc: compile('list-subject-desc'),
} as const;
