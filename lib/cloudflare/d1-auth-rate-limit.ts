import type { AuthDatabase } from "@/lib/cloudflare/d1-auth-core";

type Limit={limit:number;windowMs:number};
// Strongly consistent D1 batch, not per-isolate memory/KV. Keys contain HMAC
// digests only; IP/email are never persisted or logged. Caller supplies trusted
// edge IP (CF-Connecting-IP), never a user-supplied forwarded-for header.
export async function consumeD1AuthAttempt(db:AuthDatabase,input:{projectId:string;ip:string;email:string},
 policy:{secret:string;now?:number;ip:Limit;email:Limit}){
 const time=policy.now??Date.now(),email=input.email.trim().toLowerCase();
 if(!/^[a-z0-9]{20}$/.test(input.projectId)||!input.ip||input.ip.length>64||!email||email.length>320||!Number.isSafeInteger(time))throw new Error("Auth limiter unavailable");
 for(const limit of [policy.ip,policy.email])if(!Number.isSafeInteger(limit.limit)||limit.limit<1||!Number.isSafeInteger(limit.windowMs)||limit.windowMs<1000)throw new Error("Invalid Auth limiter policy");
 if(!/^[A-Za-z0-9_-]{43}$/.test(policy.secret))throw new Error("Auth limiter unavailable");
 const raw=Uint8Array.from(atob(policy.secret.replace(/-/g,"+").replace(/_/g,"/")+"="),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey("raw",raw.buffer,{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const subjects=[{scope:"ip",value:input.ip,limit:policy.ip},{scope:"email",value:email,limit:policy.email}];
 const statements=await Promise.all(subjects.map(async subject=>{
  const hash=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(JSON.stringify([input.projectId,subject.scope,subject.value])));
  const bucket=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");
  return {sql:`INSERT INTO d1_auth_attempt_buckets(bucket_key,attempts,reset_at) VALUES(?1,1,?3)
   ON CONFLICT(bucket_key) DO UPDATE SET attempts=CASE WHEN reset_at<=?2 THEN 1 ELSE min(attempts+1,?4) END,
    reset_at=CASE WHEN reset_at<=?2 THEN ?3 ELSE reset_at END RETURNING attempts,reset_at`,
   params:[bucket,time,time+subject.limit.windowMs,subject.limit.limit+1]};
 }));
 const results=await db.batch(statements);
 if(results.length!==2||results.some(r=>r.results?.length!==1))throw new Error("Auth limiter unavailable");
 const rows=results.map(r=>r.results![0]);
 return {allowed:rows.every((r,i)=>Number(r.attempts)<=subjects[i].limit.limit),
  retryAfter:Math.max(1,...rows.map((r,i)=>Number(r.attempts)>subjects[i].limit.limit?Math.ceil((Number(r.reset_at)-time)/1000):0))};
}
