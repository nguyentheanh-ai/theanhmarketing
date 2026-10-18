import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {authProofDigest} from '@/lib/cloudflare/auth-proof-domain';
import {authMirrorWindow,authMirrorReadySql} from '@/lib/cloudflare/d1-auth-authority';
import {authSourceRevision} from '@/lib/cloudflare/auth-source-fingerprint';
import {parseExactJson} from '@/lib/cloudflare/precise-json';
import {getCrmDateRange} from '@/lib/crm-v2/query';
import {normalizeEmail,normalizePhone} from '@/lib/crm-v2/normalize';
import {buildCrmOrderSummary} from '@/lib/crm-v2/order-summary';
import type {CrmListQuery} from '@/lib/crm-v2/types';

const PROJECT='vsxxgdzwtscuxcmjfckt',MAX_ROWS=10000;
type Role='owner'|'editor';
type Policy={now?:number;configuredOwnerEmails:readonly string[];allowedRoles?:readonly Role[]};
type RoleSource={id:string;updatedAt:string;appMetadata:Record<string,unknown>|null};
// Initial offline import only. Execute with the matching Auth import in one
// transaction; a changed/missing revision makes the read boundary deny access.
export function prepareD1AdminRoleImport(rows:readonly RoleSource[]){
 const seen=new Set<string>();
 return rows.map(row=>{
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.id)||seen.has(row.id.toLowerCase())||row.appMetadata!==null&&(typeof row.appMetadata!=='object'||Array.isArray(row.appMetadata)))throw Error('Invalid protected role snapshot');
  seen.add(row.id.toLowerCase());
  const role=row.appMetadata?.admin_role;
  return {sql:'INSERT INTO d1_admin_source_roles(user_id,source_project_id,source_revision,protected_role) VALUES(?1,?2,?3,?4)',params:[row.id.toLowerCase(),PROJECT,authSourceRevision(row.updatedAt),role==='owner'||role==='editor'?role:null]};
 });
}
class AdminReportUnavailable extends Error{constructor(){super('Native admin report unavailable');}}
function unavailable():never{throw new AdminReportUnavailable();}
function validDay(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
function dateKey(value:unknown){
 if(typeof value!=='string'||!value)return '';
 const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
}
// This is the unfiltered public.orders revenue/customer report, not the
// crm_v2.orders filtered list. Unsupported filters fail instead of changing
// the existing source's choice of canonical order data silently.
export async function readD1AdminOrderReport(db:AuthDatabase,token:string,query:Pick<CrmListQuery,'range'|'dateFrom'|'dateTo'|'search'|'filters'>,policy:Policy){
 if(query.search||Object.values(query.filters??{}).some(Boolean))throw Error('Filtered CRM report not implemented');
 if(query.range==='custom'&&(!query.dateFrom||!query.dateTo||!validDay(query.dateFrom)||!validDay(query.dateTo)))throw Error('Invalid report date range');
 const now=policy.now??Date.now(),window=authMirrorWindow({projectId:PROJECT,now});
 const range=getCrmDateRange(query,new Date(now));
 if(!validDay(range.from)||!validDay(range.to)||Date.parse(range.to)-Date.parse(range.from)>365*86400000)throw Error('Invalid report date range');
 const owners=policy.configuredOwnerEmails,roles=policy.allowedRoles??['owner'];
 if(!Array.isArray(owners)||owners.length>100||owners.some(v=>typeof v!=='string'||!v.trim()||v.length>320)||!Array.isArray(roles)||!roles.length||roles.some(v=>v!=='owner'&&v!=='editor'))throw Error('Invalid admin policy');
 if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return {status:'denied' as const};
 const ready=`${authMirrorReadySql(2,4,3)} AND EXISTS(SELECT 1 FROM d1_native_order_authority o WHERE o.source_project_id=?2 AND o.status='verified'
  AND julianday(o.snapshot_at) BETWEEN julianday(?4) AND julianday(?3) AND julianday(o.verified_at) BETWEEN julianday(?4) AND julianday(?3))`;
 // The session, protected role (including current configured fallback), Auth
 // revision, status and order snapshot are checked in ONE read statement.
 // Never accept an actor ID, role or email from request JSON/query parameters.
 const row=await db.first(`WITH admin_actor AS (
  SELECT CASE WHEN r.protected_role IN ('owner','editor') THEN r.protected_role
   WHEN EXISTS(SELECT 1 FROM json_each(?5) owner WHERE owner.value=u.normalized_email) THEN 'owner' ELSE NULL END AS role
  FROM d1_auth_sessions s JOIN d1_auth_accounts a ON a.user_id=s.user_id
  JOIN d1_access_users u ON u.id=a.user_id
  JOIN d1_auth_source_versions v ON v.user_id=a.user_id AND v.source_project_id=?2
  JOIN d1_admin_source_roles r ON r.user_id=a.user_id AND r.source_project_id=?2 AND r.source_revision=v.source_revision
  WHERE s.token_hash=?1 AND s.project_id=?2 AND s.revoked_at IS NULL AND s.session_version=a.session_version
  AND julianday(s.expires_at)>julianday(?3) AND a.email_confirmed_at IS NOT NULL AND julianday(a.email_confirmed_at)<=julianday(?3)
  AND a.deleted_at IS NULL AND a.is_anonymous=0 AND a.must_change_password=0
  AND (a.banned_until IS NULL OR julianday(a.banned_until)<=julianday(?3))
 ), authorized AS (SELECT role,(${ready}) AS ready FROM admin_actor WHERE role IN(SELECT value FROM json_each(?6)))
 SELECT role,ready,CASE WHEN ready=1 THEN (SELECT json_group_array(json(row_data)) FROM (
  SELECT json_object('id',id,'status',status,'amount',amount_vnd,
   'email',json_extract(row_json,'$.email'),'phone',json_extract(row_json,'$.phone'),
   'paidAt',json_extract(row_json,'$.paid_at'),'createdAt',json_extract(row_json,'$.created_at')) row_data
  FROM d1_native_orders ORDER BY id LIMIT 10001)) ELSE '[]' END AS rows_json FROM authorized`,
 [await authProofDigest(token,{projectId:PROJECT}),PROJECT,window.stamp,window.floor,JSON.stringify([...new Set(owners.map(v=>v.trim().toLowerCase()))]),JSON.stringify(roles)]);
 if(!row)return {status:'denied' as const};
 if(row.ready!==1||typeof row.rows_json!=='string'||row.rows_json.length>8*1024*1024)unavailable();
 const data=parseExactJson(row.rows_json);
 if(!Array.isArray(data)||data.length>MAX_ROWS)unavailable();
 const customers=new Set<string>(),metrics=[];
 let total=0;
 for(const entry of data){
  if(!entry||typeof entry!=='object')unavailable();
  const order=entry as Record<string,unknown>;
  if(typeof order.id!=='string'||typeof order.status!=='string'||typeof order.amount!=='number'||!Number.isSafeInteger(order.amount)||order.amount<=0)unavailable();
  const paid=['paid','success','completed'].includes(order.status.toLowerCase());
  const at=paid?order.paidAt??order.createdAt:order.createdAt,key=dateKey(at);
  if(!key||key<range.from||key>range.to)continue;
  metrics.push({status:order.status,amount:order.amount,createdAt:String(at)});
  if(paid){
   total+=order.amount;if(!Number.isSafeInteger(total))unavailable();
   const email=normalizeEmail(String(order.email??'')),phone=normalizePhone(String(order.phone??''));
   customers.add(email?'email:'+email:phone?'phone:'+phone:'order:'+order.id);
  }
 }
 return {status:'admin' as const,range,paidCustomers:customers.size,summary:buildCrmOrderSummary(metrics,range)};
}
