import type {SupabaseClient,User} from '@supabase/supabase-js';
import {getNativeRequestContext} from './native-request-context';
// Lightweight switch used by lib/supabase/* and lib/auth/session. The heavy D1
// client is registered by the Worker entry, so Node/Next builds never load it.
type Role={role:'anon'|'authenticated';uid:string|null;isAdmin:boolean;jwtAdminRole:string|null};
type Factory={client:(auth:Role|null)=>SupabaseClient|null;currentUser:()=>Promise<User|null>;verifyPassword:(email:string,password:string)=>Promise<boolean>};
const key=Symbol.for('theanh.cloudflare.native-data-factory.v1');
const store=globalThis as typeof globalThis&{[key]?:Factory};
export function registerNativeDataFactory(factory:Factory){store[key]=factory;}
export const nativeDataModeEnabled=()=>(getNativeRequestContext()?.env as {CF_NATIVE_DATA_MODE?:string}|undefined)?.CF_NATIVE_DATA_MODE==='d1';
export function nativeDataClient(auth:Role|null=null):SupabaseClient|null{
 if(!nativeDataModeEnabled())return null;
 const f=store[key];if(!f)throw new Error('Native D1 mode: data client not registered');
 return f.client(auth);
}
export async function nativeCurrentUser(){const f=store[key];return f?f.currentUser():null;}

// Native replacement for a Supabase signInWithPassword credential check (no session issued).
export async function nativeVerifyPassword(email:string,password:string){const f=store[key];if(!f)throw new Error('Native D1 mode: data client not registered');return f.verifyPassword(email,password);}
