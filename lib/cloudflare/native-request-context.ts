import {AsyncLocalStorage} from 'node:async_hooks';
import type {NativeStageEnv} from '@/lib/cloudflare/native-stage-router';

type NativeRequestContext={readonly request:Request;readonly env:NativeStageEnv};
// Vite's Worker and RSC graphs can instantiate the same module separately.
// Share only the ALS container per isolate, never a global request/user value.
const key=Symbol.for('theanh.cloudflare.native-request-context.v1');
const containers=globalThis as typeof globalThis & {[key]?:AsyncLocalStorage<NativeRequestContext>};
const storage=containers[key]??(containers[key]=new AsyncLocalStorage<NativeRequestContext>());
export function runNativeRequestContext<T>(request:Request,env:NativeStageEnv,callback:()=>T):T{
 return storage.run(Object.freeze({request,env}),callback);
}
// Backend only. Bindings and cookies must never be serialized into client props.
export function getNativeRequestContext(){return storage.getStore();}
