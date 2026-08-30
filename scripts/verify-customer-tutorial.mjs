import { compileNamedParameters } from '../packages/named-parameters/dist/compiler.js';
import { bindNamedParameters } from '../packages/named-parameters/dist/index.js';

const statement = compileNamedParameters('select id from users where id = :id');
const bound = bindNamedParameters(statement, { id: 42 });
if (bound.sql !== 'select id from users where id = $1' || bound.values[0] !== 42) throw new Error('Direct named-parameter tutorial smoke failed.');
try { bindNamedParameters(statement, {}); throw new Error('Missing parameter was accepted.'); } catch (error) { if (error instanceof Error && !error.message.includes('Missing')) throw error; }
try { bindNamedParameters(statement, { id: 42, extra: true }); throw new Error('Unused parameter was accepted.'); } catch (error) { if (error instanceof Error && !error.message.includes('Unused')) throw error; }
console.log('Direct compiler/binder tutorial smoke passed.');
