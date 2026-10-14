export type SourceProviderIdentity={id:string;userId:string;provider:string;providerId:string;email:string|null;
 identityData:Record<string,unknown>;lastSignInAt:string|null;createdAt:string;updatedAt:string};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function stamp(value:string|null,required=false){if(value===null&&!required)return null;if(typeof value!=='string'||!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)||!Number.isFinite(Date.parse(value)))throw new Error('Invalid identity timestamp');return new Date(value).toISOString();}
// Offline initial import only; do not automatically link accounts by email.
export function prepareD1ProviderIdentityImport(rows:readonly SourceProviderIdentity[],options:{projectId:string;userIds:readonly string[]}){
 if(!/^[a-z0-9]{20}$/.test(options.projectId))throw new Error('Invalid identity project');
 const users=new Set(options.userIds.map(id=>id.toLowerCase())),ids=new Set<string>(),subjects=new Set<string>();
 return rows.map(row=>{
  if(!UUID.test(row.id)||ids.has(row.id.toLowerCase())||!UUID.test(row.userId)||!users.has(row.userId.toLowerCase())||!['email','google'].includes(row.provider)||typeof row.providerId!=='string'||!row.providerId||row.providerId.length>1024||typeof row.identityData!=='object'||!row.identityData||Array.isArray(row.identityData)||(row.email!==null&&typeof row.email!=='string'))throw new Error('Provider identity mapping unavailable');
  const subject=JSON.stringify([row.provider,row.providerId]);if(subjects.has(subject))throw new Error('Ambiguous provider subject');
  ids.add(row.id.toLowerCase());subjects.add(subject);
  return {sql:`INSERT INTO d1_auth_provider_identities(id,source_project_id,user_id,provider,provider_id,email,identity_data,last_sign_in_at,created_at,updated_at)
   VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)`,params:[row.id.toLowerCase(),options.projectId,row.userId.toLowerCase(),row.provider,row.providerId,row.email,JSON.stringify(row.identityData),stamp(row.lastSignInAt),stamp(row.createdAt,true),stamp(row.updatedAt,true)]};
 });
}
