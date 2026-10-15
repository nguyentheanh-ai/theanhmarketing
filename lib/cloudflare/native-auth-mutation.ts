"use client";

// One origin-wide exclusive lock for participating native Auth forms. Hold it
// through fetch, response parsing and UI application. Never nest this helper.
// This does not coordinate browser navigation/RSC/SSR Set-Cookie responses, old
// clients or other origins, and is not the complete late-cookie safety gate.
const LOCK_NAME='theanh-native-auth-mutation-v1';
export class NativeAuthCoordinationError extends Error {
 constructor(){super('Chưa thể thực hiện thao tác tài khoản an toàn lúc này. Vui lòng thử lại.');}
}
export async function withNativeAuthMutation<T>(action:()=>Promise<T>,options:{signal?:AbortSignal}={}):Promise<T>{
 const locks=typeof navigator==='undefined'?undefined:navigator.locks;
 if(!locks||typeof locks.request!=='function')throw new NativeAuthCoordinationError();
 let started=false;
 try{
  return await locks.request(LOCK_NAME,{mode:'exclusive',signal:options.signal??AbortSignal.timeout(30000)},async lock=>{
   if(!lock||lock.name!==LOCK_NAME||lock.mode!=='exclusive')throw new NativeAuthCoordinationError();
   started=true;return action();
  });
 }catch(error){if(!started)throw new NativeAuthCoordinationError();throw error;}
}
