import { isSupportedLegacyBcryptHash, sealLegacyBcryptHash } from "@/lib/cloudflare/legacy-password";

// Offline/admin migration input only. Never deserialize this from an HTTP user
// request, print it, or emit raw SQL literals. execute as prepared batch(s) in a
// staging database, with a verified initial snapshot and no existing Auth rows.
export type AuthSourceRow={id:string;email:string|null;encryptedPassword:string|null;
 emailConfirmedAt:string|null;bannedUntil:string|null;deletedAt:string|null;isAnonymous:boolean;
 userMetadata:Record<string,unknown>|null;appMetadata:Record<string,unknown>|null;
 createdAt:string;updatedAt:string};
type Statement={sql:string;params:(string|number|null)[]};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function stamp(value:string|null,required=false){
 if(value===null&&!required)return null;
 // Require an explicit zone; never reinterpret a source timestamp as local time.
 if(typeof value!=="string"||!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)||!Number.isFinite(Date.parse(value)))throw new Error("Invalid Auth source timestamp");
 return new Date(value).toISOString();
}
function metadata(value:Record<string,unknown>|null){
 if(value===null)return {};
 if(typeof value!=="object"||Array.isArray(value))throw new Error("Invalid Auth source metadata");
 return value;
}
export async function prepareD1AuthInitialImport(source:readonly AuthSourceRow[],options:{projectId:string;credentialKey:string;
 // Trusted source-specific resolver. For A use protected app_metadata role plus
 // configured owner email semantics; B must use its own audited role resolver.
 resolveRole:(row:AuthSourceRow)=>"owner"|"editor"|null}){
 if(!/^[a-z0-9]{20}$/.test(options.projectId))throw new Error("Invalid Auth source project");
 const ids=new Set<string>(),emails=new Set<string>();
 // Validate the entire dataset BEFORE encryption or returning a partial plan.
 const rows=source.map(row=>{
  const email=(row.email??"").trim().toLowerCase(),id=row.id?.toLowerCase();
  if(!UUID.test(id)||ids.has(id)||!email||email.length>320||emails.has(email)||typeof row.isAnonymous!=="boolean")throw new Error("Auth identity mapping unavailable");
  ids.add(id);emails.add(email);
  if(row.encryptedPassword&& !isSupportedLegacyBcryptHash(row.encryptedPassword))throw new Error("Unsupported source credential format");
  const userMetadata=metadata(row.userMetadata);metadata(row.appMetadata);
  const role=options.resolveRole(row);if(role!==null&&role!=="owner"&&role!=="editor")throw new Error("Invalid protected Auth role");
  return {row,id,email,role,userMetadata,createdAt:stamp(row.createdAt,true)!,updatedAt:stamp(row.updatedAt,true)!,
   confirmedAt:stamp(row.emailConfirmedAt),bannedUntil:stamp(row.bannedUntil),deletedAt:stamp(row.deletedAt)};
 });
 const statements:Statement[]=[];
 for(const item of rows){
  const ciphertext=item.row.encryptedPassword?await sealLegacyBcryptHash(item.row.encryptedPassword,options.credentialKey,{projectId:options.projectId,userId:item.id}):null;
  // Plain INSERT is deliberate: never overwrite an existing account/session
  // version, resurrect a deleted account, or turn this into blind delta upsert.
  statements.push({sql:"INSERT INTO d1_access_users(id,normalized_email,admin_role) VALUES(?1,?2,?3)",params:[item.id,item.email,item.role]});
  statements.push({sql:`INSERT INTO d1_auth_accounts(user_id,credential_ciphertext,email_confirmed_at,banned_until,deleted_at,is_anonymous,
   session_version,must_change_password,user_metadata,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,1,?7,?8,?9,?10)`,
   params:[item.id,ciphertext,item.confirmedAt,item.bannedUntil,item.deletedAt,Number(item.row.isAnonymous),Number(item.userMetadata.must_change_password===true),JSON.stringify(item.userMetadata),item.createdAt,item.updatedAt]});
 }
 return {statements,summary:{users:rows.length,passwordCredentials:rows.filter(r=>Boolean(r.row.encryptedPassword)).length,
  passwordlessUsers:rows.filter(r=>!r.row.encryptedPassword).length,confirmedUsers:rows.filter(r=>r.confirmedAt!==null).length,
  protectedAdmins:rows.filter(r=>r.role!==null).length}};
}
