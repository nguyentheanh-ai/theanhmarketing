import test from 'node:test';
import assert from 'node:assert/strict';
import {postgresRowJson} from '../scripts/probe-sealed-orders.mjs';
test('order adapter retains numeric literals and nested JSON without roundtrip precision loss',()=>{
  const columns=[{n:'amount',ty:'numeric'},{n:'large',ty:'bigint'},{n:'metadata',ty:'jsonb'},{n:'flag',ty:'boolean'},{n:'optional',ty:'text'},{n:'created_at',ty:'timestamp with time zone'}];
  const raw=postgresRowJson(columns,['399000.00','9007199254740993','{"n":9007199254740993,"s":"fixture"}','true',null,'2026-10-18 11:30:00.123456+00']);
  assert.ok(raw.includes('"amount":399000.00'));assert.ok(raw.includes('"large":9007199254740993'));assert.ok(raw.includes('"metadata":{"n":9007199254740993'));
  assert.equal(JSON.parse(raw).flag,true);assert.equal(JSON.parse(raw).optional,null);
  assert.ok(JSON.parse(raw).created_at.endsWith('.123456+00:00'));
});
test('unsupported types, invalid booleans/numbers, duplicate columns fail closed',()=>{
  for(const [ty,value] of [['ARRAY','{a,b}'],['numeric','NaN'],['numeric','01'],['boolean','1'],['jsonb','not-json']])assert.throws(()=>postgresRowJson([{n:'x',ty}],[value]));
  assert.throws(()=>postgresRowJson([{n:'x',ty:'text'},{n:'x',ty:'text'}],['one','two']));
});
