import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// Offline release check. Never deploys, reads credentials, or prints config vars.
export function verifyProductionWorkerConfig(config,{attachDomains=false,appUrl,siteUrl}={}) {
  const fail=message=>{throw new Error(message);};
  if(config.name!=='theanh-main-cf-production')fail('Wrong Worker: rebuild with scripts/build-cloudflare-production.sh');
  if(appUrl!=='https://app.theanhmarketing.com'||siteUrl!=='https://www.theanhmarketing.com')fail('Production public URL mismatch');
  const vars=config.vars??{};
  const gates=['CF_NATIVE_MARKETING_MODE','CF_NATIVE_AUTH_MODE','CF_NATIVE_QA_PROGRESS_MODE','CF_NATIVE_QA_AUTH_CONTEXT_MODE','CF_NATIVE_QA_REFRESH_MODE','CF_NATIVE_QA_GOOGLE_MODE','CF_NATIVE_QA_PAYMENT_MODE','CF_NATIVE_QA_EMAIL_AUTH_MODE','CF_NATIVE_QA_CREDENTIAL_WRITES'];
  if(gates.some(name=>vars[name]!=='disabled')||vars.CF_NATIVE_QA_USERS!=='[]')fail('Native gate or QA cohort is not disabled');
  if(vars.CF_R2_STAGE_PRIVATE_DELIVERY!=='false')fail('Production Storage source changed');
  if(vars.CF_CRON_ORIGIN!=='https://www.theanhmarketing.com')fail('Wrong cron origin');
  if(vars.CF_CRON_MODE!==(attachDomains?'enabled':'disabled'))fail('Cron mode disagrees with cutover build mode');
  const services=config.services??[];
  if(services.filter(x=>x.binding==='STUDENT_APP').length!==1||services.find(x=>x.binding==='STUDENT_APP')?.service!=='theanh-student-cf-production')fail('Missing or incorrect A to B service binding');
  if(config.d1_databases?.find(x=>x.binding==='NATIVE_AUTH_DB')?.database_id!=='f0f2a18e-22c3-4695-99af-a5065aa7dbe5')fail('Wrong production D1 binding');
  const crons=config.triggers?.crons??[],routes=config.routes??[];
  if(attachDomains){
    if(crons.length!==1||crons[0]!=='*/5 * * * *')fail('Wrong production cron trigger');
    if(routes.length!==2||!['theanhmarketing.com','www.theanhmarketing.com'].every(domain=>routes.some(r=>r.pattern===domain&&r.custom_domain===true)))fail('Wrong custom domains');
  }else if(crons.length||routes.length)fail('Preview build unexpectedly attaches domains or cron');
  return {worker:config.name,attachDomains,checkedGates:gates.length,status:'PASS'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const config=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
    const result=verifyProductionWorkerConfig(config,{attachDomains:process.env.CF_ATTACH_PRODUCTION_DOMAINS==='1',appUrl:process.env.NEXT_PUBLIC_APP_URL,siteUrl:process.env.NEXT_PUBLIC_SITE_URL});
    console.log(JSON.stringify(result));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
