import type { AuthDatabase } from '@/lib/cloudflare/d1-auth-core';
import type { Miniflare } from 'miniflare';

// Reuse the installed Cloudflare SDK's D1 binding type; this import is erased
// from the Worker bundle. No hand-written Env or cast hiding binding drift.
// Request-scoped session pins the first read to primary and preserves sequential
// consistency thereafter; never retain this object between requests.
export type AuthD1Binding = Awaited<ReturnType<Miniflare['getD1Database']>>;
function row(value: unknown): value is Record<string, unknown> {
 return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function createD1AuthDatabase(binding: AuthD1Binding): AuthDatabase {
 let session: ReturnType<AuthD1Binding['withSession']>;
 try { session = binding.withSession('first-primary'); }
 catch { throw new Error('Auth database unavailable'); }
 return {
  async first(sql, parameters) {
   try {
    const value = await session.prepare(sql).bind(...parameters).first();
    if (value !== null && !row(value)) throw new Error();
    return value;
   } catch { throw new Error('Auth database unavailable'); }
  },
  async batch(statements) {
   try {
    // One platform batch is one transaction. Do not emulate with run/Promise.all.
    const results = await session.batch(statements.map(s => session.prepare(s.sql).bind(...s.params)));
    if (!Array.isArray(results) || results.length !== statements.length) throw new Error();
    return results.map(result => {
     if (!row(result) || result.success !== true || !Array.isArray(result.results) || !result.results.every(row)) throw new Error();
     return { results: result.results };
    });
   } catch {
    // D1 errors can contain SQL, bound credential material or provider subjects.
    // The caller receives an outage; raw errors must not reach invocation logs.
    throw new Error('Auth database unavailable');
   }
  },
 };
}
