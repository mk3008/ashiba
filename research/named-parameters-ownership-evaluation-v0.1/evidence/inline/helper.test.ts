import assert from 'node:assert/strict';
import { bind, compile } from './helper.js';

const statement = compile(`select :tenantId::uuid, :tenantId, ':not', "id:name" -- :comment
/* :block */ where status = :status and title <> :hostileValue and body = $$:dollar$$`);
assert.equal(statement.sql.includes('$1::uuid, $1'), true);
assert.deepEqual(statement.names, ['tenantId', 'status', 'hostileValue']);
const hostile = "x'); drop table work_items; --";
assert.deepEqual(bind(statement, { tenantId: 'id', status: null, hostileValue: hostile }).values, ['id', null, hostile]);
assert.throws(() => bind(statement, { tenantId: 'id', status: null }), /missing=hostileValue/);
assert.throws(() => bind(statement, { tenantId: 'id', status: null, hostileValue: hostile, extra: true }), /extra=extra/);
console.log('INLINE_HELPER_PASS');
