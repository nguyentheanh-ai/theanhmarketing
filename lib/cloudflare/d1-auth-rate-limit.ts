import type { AuthDatabase } from "@/lib/cloudflare/d1-auth-core";

type Limit={limit:number;windowMs:number};
type Subject={scope:string;value:string;limit:Limit};
async function consumeBuckets(db:AuthDatabase,projectId:string,subjects:Subject[],secret:string,time:number){
 if(!/^[a-z0-9]{20}$/.test(projectId)||!Number.isSafeInteger(time)||time<0||!subjects.length)throw new Error("Auth limiter unavailable");
 for(const subject of subjects)if(!subject.value||subject.value.length>320||!Number.isSafeInteger(subject.limit.limit)||subject.limit.limit<1||subject.limit.limit>=Number.MAX_SAFE_INTEGER||!Number.isSafeInteger(subject.limit.windowMs)||subject.limit.windowMs<1000||!Number.isSafeInteger(time+subject.limit.windowMs))throw new Error("Invalid Auth limiter policy");
 if(!/^[A-Za-z0-9_-]{43}$/.test(secret))throw new Error("Auth limiter unavailable");
 const raw=Uint8Array.from(atob(secret.replace(/-/g,"+").replace(/_/g,"/")+"="),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey("raw",raw.buffer,{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const statements=await Promise.all(subjects.map(async subject=>{
  const hash=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(JSON.stringify([projectId,subject.scope,subject.value])));
  const bucket=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");
  return {sql:`INSERT INTO d1_auth_attempt_buckets(bucket_key,attempts,reset_at) VALUES(?1,1,?3)
   ON CONFLICT(bucket_key) DO UPDATE SET attempts=CASE WHEN reset_at<=?2 THEN 1 ELSE min(attempts+1,?4) END,
    reset_at=CASE WHEN reset_at<=?2 THEN ?3 ELSE reset_at END RETURNING attempts,reset_at`,
   params:[bucket,time,time+subject.limit.windowMs,subject.limit.limit+1]};
 }));
 const results=await db.batch(statements);
 if(results.length!==subjects.length||results.some(r=>r.results?.length!==1))throw new Error("Auth limiter unavailable");
 const rows=results.map(r=>r.results![0]);
 if(rows.some(r=>!Number.isSafeInteger(r.attempts)||Number(r.attempts)<1||!Number.isSafeInteger(r.reset_at)))throw new Error("Auth limiter unavailable");
 return {allowed:rows.every((r,i)=>Number(r.attempts)<=subjects[i].limit.limit),
  retryAfter:Math.max(1,...rows.map((r,i)=>Number(r.attempts)>subjects[i].limit.limit?Math.ceil((Number(r.reset_at)-time)/1000):0))};
}
// Strongly consistent D1 batch, not per-isolate memory/KV. Keys contain HMAC
// digests only; IP/email are never persisted or logged. Caller supplies trusted
// edge IP (CF-Connecting-IP), never a user-supplied forwarded-for header.
export async function consumeD1AuthAttempt(db:AuthDatabase,input:{projectId:string;ip:string;email:string},
 policy:{secret:string;now?:number;ip:Limit;email:Limit}){
 const time=policy.now??Date.now(),email=input.email.trim().toLowerCase();
 if(!/^[a-z0-9]{20}$/.test(input.projectId)||!input.ip||input.ip.length>64||!email||email.length>320||!Number.isSafeInteger(time))throw new Error("Auth limiter unavailable");
 const subjects=[{scope:"ip",value:input.ip,limit:policy.ip},{scope:"email",value:email,limit:policy.email}];
 return consumeBuckets(db,input.projectId,subjects,policy.secret,time);
}

// Called only from a public Cloudflare edge Worker. Never accept a forwarded IP
// from JSON, query, X-Forwarded-For or an untrusted Worker-to-Worker request.
// Phase/provider namespaces keep login starts from exhausting callback capacity.
export async function consumeD1OAuthRequest(db:AuthDatabase,request:Request,input:{projectId:string;provider:'google'|'facebook';phase:'start'|'callback'},policy:{secret:string;now?:number;ip:Limit}){
 const ip=request.headers.get('CF-Connecting-IP');
 if(!ip||ip.length>64||/[\s,]/.test(ip)||!['google','facebook'].includes(input.provider)||!['start','callback'].includes(input.phase))throw new Error('Auth limiter unavailable');
 return consumeBuckets(db,input.projectId,[{scope:`oauth:${input.provider}:${input.phase}:ip`,value:ip,limit:policy.ip}],policy.secret,policy.now??Date.now());
}
