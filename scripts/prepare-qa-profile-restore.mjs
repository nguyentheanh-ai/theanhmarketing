// Private pipe only: prepared SQL contains original QA fields; never call as a
// user-facing CLI or echo its stdout. Python controller captures the result.
import {build} from 'esbuild';
try{let input='';for await(const chunk of process.stdin){input+=chunk;if(Buffer.byteLength(input)>131072)throw Error('Bound exceeded')}
 const b=await build({entryPoints:['lib/cloudflare/d1-qa-profile-restore.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
 const {prepareQaProfileRestore}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
 console.log(JSON.stringify({status:'PREPARED',...prepareQaProfileRestore(JSON.parse(input))}));
}catch{console.log(JSON.stringify({status:'FAILED',message:'QA profile restore refused; private state withheld'}));process.exitCode=1}
