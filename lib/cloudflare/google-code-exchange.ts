import {requireClaimedGoogleTransaction,type ClaimedGoogleTransaction} from '@/lib/cloudflare/d1-google-transaction';
// Server-only. No provider access/refresh token persisted or returned. Caller
// marks a failed flow and restarts rather than replaying a consumed code.
export async function exchangeGoogleAuthorizationCode(transaction:ClaimedGoogleTransaction,code:string,clientSecret:string,fetcher:typeof fetch=fetch){
 const tx=requireClaimedGoogleTransaction(transaction);
 if(!code||code.length>8192||!clientSecret||clientSecret.length>4096)throw new Error('Google code exchange unavailable');
 const body=new URLSearchParams({grant_type:'authorization_code',code,client_id:tx.clientId,client_secret:clientSecret,redirect_uri:tx.redirectUri,code_verifier:tx.verifier});
 let response:Response;try{response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,redirect:'manual',signal:AbortSignal.timeout(10000)});}catch{throw new Error('Google code exchange unavailable');}
 // Workers supports manual/follow; reject every redirect before parsing a body.
 if(!response.ok){try{await response.body?.cancel();}catch{}throw new Error('Google code exchange rejected');}
 const reader=response.body?.getReader();if(!reader)throw new Error('Google code exchange unavailable');
 const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768){await reader.cancel();throw new Error('Google response unavailable');}chunks.push(value);}}
 catch{try{await reader.cancel();}catch{}throw new Error('Google response unavailable');}
 finally{reader.releaseLock();}
 try{const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  const result:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!result||typeof result!=='object'||!('id_token' in result)||typeof result.id_token!=='string'||!result.id_token||result.id_token.length>16384)throw new Error();
  return result.id_token;
 }catch{throw new Error('Google response unavailable');}
}
