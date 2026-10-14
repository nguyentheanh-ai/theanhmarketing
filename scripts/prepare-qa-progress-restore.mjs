// Private stdin/stdout protocol for the local Python orchestrator only.
import {build} from 'esbuild';
let input='';for await(const chunk of process.stdin){input+=chunk;if(Buffer.byteLength(input)>2*1024*1024)throw Error('QA restore payload too large')}
try{
 const b=await build({entryPoints:['lib/cloudflare/d1-qa-progress-restore.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
 const {prepareQaProgressRestore}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
 console.log(JSON.stringify({status:'PREPARED',...prepareQaProgressRestore(JSON.parse(input))}));
}catch{console.log(JSON.stringify({status:'FAILED',message:'QA restore validation rejected; private state withheld'}));process.exitCode=1}
