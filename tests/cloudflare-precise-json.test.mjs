import test from 'node:test';
import assert from 'node:assert/strict';
import {parseExactJson} from '../lib/cloudflare/precise-json.ts';
test('JSON refuses changed decimal/integer/underflow values at any depth',()=>{
  for(const raw of ['{"amount":399000.000000000000000001}','{"metadata":{"id":9007199254740993}}','[1e309]','[1e-999]'])assert.throws(()=>parseExactJson(raw),/unavailable/);
});
test('decimal equivalents, escaped string digits and exact scientific notation remain valid',()=>{
  assert.deepEqual(parseExactJson('{"amount":399000.00,"rate":0.1,"exponent":1.2300e2,"n":-0,"text":"9007199254740993 \\"quoted\\""}'),{amount:399000,rate:0.1,exponent:123,n:-0,text:'9007199254740993 "quoted"'});
  assert.equal(parseExactJson('"399000.000000000000000001"'),'399000.000000000000000001');
  assert.throws(()=>parseExactJson('{"invalid":01}'));
});
