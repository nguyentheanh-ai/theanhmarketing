// Read-only observation after a staging configuration change. No login or writes.
export async function observeNativeSession(call, parseJson, origin, pause = ms => new Promise(resolve => setTimeout(resolve, ms))) {
 const probes=[];
 for(let attempt=1;attempt<=20;attempt++) {
  let response;
  try { response=await call('/api/cloudflare-auth/session'); }
  catch { probes.push({attempt,status:null,ready:false,error:'REQUEST_FAILED'});return {ready:false,probes}; }
  const contentType=response.headers.get('content-type')??'';
  const probe={attempt,status:response.status,contentType,ready:false};probes.push(probe);
  if(response.status===200&&response.url===origin+'/api/cloudflare-auth/session'&&contentType.startsWith('application/json')) {
   try {const data=await parseJson(response);probe.ready=data.ok===true&&data.user===null;}catch {probe.error='INVALID_SESSION_RESPONSE';}
   return {ready:probe.ready,probes};
  }
  await response.body?.cancel();
  if(![404,503].includes(response.status))return {ready:false,probes};
  if(attempt<20)await pause(2000);
 }
 return {ready:false,probes};
}

// A settings update may reach two consecutive requests at different times.
// Only this exact router guard is safe to replay: it runs before Auth/DB work.
// Never retry generic 503s, network failures, or a response that issued cookies.
export async function requestAfterNativeGate(request, parseJson, {origin,path,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}) {
 for(let attempt=1;attempt<=16;attempt++) {
  const response=await request();
  if(attempt===16||response.url!==origin+path||response.status!==503||response.headers.has('set-cookie')||!response.headers.get('content-type')?.startsWith('application/json'))return response;
  let data;try{data=await parseJson(response.clone());}catch{return response;}
  if(data?.ok!==false||data?.code!=='NATIVE_D1_DISABLED')return response;
  await response.body?.cancel();
  await pause(2000);
 }
}
