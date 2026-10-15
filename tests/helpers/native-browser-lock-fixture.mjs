// Model only: this is not a real browser or Safari compatibility result.
import {beforeEach,afterEach} from 'node:test';import {build} from 'esbuild';
const b=await build({entryPoints:['lib/cloudflare/native-auth-mutation.ts'],bundle:true,platform:'node',format:'esm',write:false});
export const nativeAuthCoordination=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
let descriptor,active=0;
export function nativeLockHeld(){return active===1;}
export function installNativeLockFixture(){beforeEach(()=>{active=0;descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');let tail=Promise.resolve();Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request(name,options,action){const run=tail.then(async()=>{options.signal?.throwIfAborted();active++;try{return await action({name,mode:'exclusive'})}finally{active--}});tail=run.catch(()=>{});return run}}}})});afterEach(()=>{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator})}
