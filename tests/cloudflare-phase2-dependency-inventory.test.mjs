import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {inventory} from '../scripts/inventory-supabase-dependencies.mjs';

const compilerRoot = process.env.PHASE2_TYPESCRIPT_ROOT ?? path.resolve('../main');
const ts = createRequire(path.join(compilerRoot, 'package.json'))('typescript');

function fixture(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tam-dependency-fixture-'));
  t.after(() => fs.rmSync(root, {recursive: true}));
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), {recursive: true});
    fs.writeFileSync(path.join(root, name), text);
  }
  return root;
}

test('trace aliases and reexports through cycles without confusing comments or Array.from', t => {
  const root = fixture(t, {
    'app/api/orders/route.ts': `import {read} from '@/services/barrel'; export const GET=read;`,
    'services/barrel.ts': `export {read} from './orders';`,
    'services/orders.ts': `import './barrel'; import {createClient} from '@supabase/supabase-js';
      const supabase=createClient(); export const read=()=>supabase.from('orders').select('*');
      // supabase.from('fake_comment')
      const string="supabase.from('fake_string')"; Array.from([]);`,
  });
  const result = inventory(root, ts, 'A');
  assert.deepEqual(result.summary.tables, ['orders']);
  assert.equal(result.summary.sdkCalls, 1);
  assert.equal(result.summary.entrypointsWithDependencies, 1);
  assert.deepEqual(result.entries[0].staticSupabaseDependencies, ['services/orders.ts']);
});

test('storage bucket is not counted as table; dynamic RPC and schema selectors stay visible', t => {
  const root = fixture(t, {
    'src/app/api/files/route.ts': `import {client} from '@/lib/supabase/server';
      client.storage.from('private_files').download(fileId); client.auth.getUser();
      client.schema('crm_v2').from('contacts'); client.rpc(dynamicRpc);`,
    'src/lib/supabase/server.ts': `export const client={};`,
  });
  const result = inventory(root, ts, 'B');
  assert.deepEqual(result.summary.tables, ['contacts']);
  assert.equal(result.summary.dynamicRelationsOrRpcs, 1);
  assert.equal(result.sourceRoot, 'src');
  assert.ok(result.dependencyModules.flatMap(m => m.operations).some(o => o.kind === 'storage'));
  assert.ok(result.dependencyModules.flatMap(m => m.operations).some(o => o.kind === 'auth'));
});

test('root proxy, static dynamic-import and unresolved modules are included; test files excluded', t => {
  const root = fixture(t, {
    'app/page.tsx': `export default function Page(){return null;}`,
    'proxy.ts': `export async function x(){return import('./lib/auth')}`,
    'lib/auth.ts': `import {client} from '@supabase/supabase-js'; import './missing';`,
    'lib/auth.test.ts': `client.from('fake_test_table');`,
  });
  const result = inventory(root, ts, 'A');
  assert.equal(result.entries.length, 2);
  assert.equal(result.summary.unresolvedLocalImports, 1);
  assert.equal(result.summary.entrypointsWithDependencies, 1);
  assert.deepEqual(result.summary.tables, []);
  assert.equal(result.entries.find(e => e.file === 'app/page.tsx').runtimeSupabaseIndependence, 'NOT_ESTABLISHED_BY_STATIC_SCAN');
});

test('inventory does not serialize credentials, query payloads or URL arguments', t => {
  const secret = 'fixture-sensitive-string-never-serialize';
  const root = fixture(t, {'app/api/auth/route.ts': `import {client} from '@supabase/supabase-js';
    client.auth.signInWithPassword({email:'private@example.invalid',password:'${secret}'});
    client.from('orders').insert({api_key:'${secret}'});`});
  const output = JSON.stringify(inventory(root, ts, 'A'));
  assert.ok(!output.includes(secret));
  assert.ok(!output.includes('private@example.invalid'));
});

test('local SDK factory aliases and typed database parameters retain RPC dependencies', t => {
  const root = fixture(t, {
    'src/app/api/automation/route.ts': `import {getSupabaseAdmin as getStore} from '@/lib/supabase-admin';
      const db=getStore()!; const other=db;
      db.rpc('ads_os_claim_automation_rules'); other.from('ads_os_automation_rules');
      function run(database: SupabaseClient){database.rpc('claim_due_work');}`,
    'src/lib/supabase-admin.ts': `import {createClient} from '@supabase/supabase-js'; export const getSupabaseAdmin=()=>createClient();`,
  });
  const result = inventory(root, ts, 'B');
  assert.deepEqual(result.summary.rpcs, ['ads_os_claim_automation_rules', 'claim_due_work']);
  assert.deepEqual(result.summary.tables, ['ads_os_automation_rules']);
});
