import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
// Assets use htmlHandling "drop-trailing-slash": /x serves public/x.html and
// /x/index.html. Every next.config rewrite to a public .html must therefore be
// either the same pretty path or listed in STATIC_ASSET_ALIASES.
test('every static .html rewrite is reachable on Workers assets',()=>{
 const worker=readFileSync('cloudflare-worker.ts','utf8'),aliases=JSON.parse(worker.match(/STATIC_ASSET_ALIASES: Record<string, string> = (\{[^}]*\})/)[1]);
 const rewrites=[...readFileSync('next.config.ts','utf8').matchAll(/source: "([^"]+)",\s*destination: "([^"]+\.html)"/g)].map(m=>[m[1],m[2]]);
 assert(rewrites.length>=5);
 for(const [source,dest] of rewrites){assert(existsSync('public'+dest),dest);const pretty=dest.replace(/\.html$/,'');assert(source===pretty||aliases[source]===pretty,`${source} -> ${dest} needs an alias`)}
 for(const [s,d] of Object.entries(aliases))assert(rewrites.some(([a,b])=>a===s&&b===d+'.html'),`stale alias ${s}`);
 assert.match(readFileSync('cloudflare.config.ts','utf8'),/htmlHandling: "drop-trailing-slash"/);
});
test('apex domain redirects to www with 307 like Vercel, before any app routing',()=>{
 const worker=readFileSync('cloudflare-worker.ts','utf8'),fetchBody=worker.slice(worker.indexOf('async fetch('),worker.indexOf('stagingWorker.route(request'));
 assert.match(fetchBody,/hostname === "theanhmarketing\.com"/);assert.match(fetchBody,/"www\.theanhmarketing\.com"/);assert.match(fetchBody,/Response\.redirect\(incoming\.toString\(\), 307\)/);
});
