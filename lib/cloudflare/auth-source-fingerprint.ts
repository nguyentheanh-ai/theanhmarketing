// Internal migration fingerprints; never print inputs, digests or hashes.
function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[k,canonical(v)]));
 return value;
}
export async function authSourceDigest(user:readonly unknown[],account:readonly unknown[],sourceHash:string|null){
 const values=[...user,...account];values[4]=sourceHash;
 // Metadata is JSON text in SQL; normalize object key order for source digest.
 values[10]=canonical(JSON.parse(String(account[7])));
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(values))));
 return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
export function authSourceRevision(stamp:string){
 const match=stamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.(\d{1,6}))?(?:Z|[+-]\d{2}:?\d{2})$/i);
 const ms=Date.parse(stamp);if(!match||!Number.isSafeInteger(ms)||ms<0)throw new Error('Invalid Auth source revision');
 const micros=BigInt(ms)*BigInt(1000)+BigInt((match[1]??'').padEnd(6,'0').slice(3));
 const value=micros.toString();if(value.length>20)throw new Error('Invalid Auth source revision');return value.padStart(20,'0');
}
