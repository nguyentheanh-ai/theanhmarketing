// Supabase-js compatible query client over the D1 mirror of the Supabase
// schema (tables named <project>_<schema>__<table>, see build-d1-native-ddl.py).
// It lets the existing services run unchanged on D1: PostgREST select syntax
// (columns, aliases, embedded relations through foreign keys, !inner), filters,
// or() trees, order/range/limit, count, single/maybeSingle, insert/update/
// upsert/delete with returning, plus registered RPC implementations.
// Service-role semantics only: no RLS is applied (same as the admin client).

export type ShimSchema={project:string;tables:Record<string,{triggers?:{name:string;timing:string;events:string;function:string}[];cols:Record<string,[string,string|null,boolean]>;pk:string[];uniques:{cols:string[];where:string|null}[];fks:{name:string;cols:string[];ref:string;refCols:string[];onDelete:string}[]}>};
export type ShimRow=Record<string,unknown>;
export type ShimDatabase={all:(sql:string,params:unknown[])=>Promise<ShimRow[]>;batch?:(statements:{sql:string;params:unknown[]}[])=>Promise<ShimRow[][]>};
export type ShimError={message:string;code:string;details:string|null;hint:string|null};
export type ShimResult<T=unknown>={data:T|null;error:ShimError|null;count:number|null;status:number;statusText:string};
export type ShimRpc=(args:Record<string,unknown>,context:{client:D1PostgrestClient;now:()=>number;auth:ShimAuth|null})=>Promise<unknown>;
// Caller identity for RLS. Absent = service_role (RLS bypassed, like the admin client).
export type ShimAuth={role:'anon'|'authenticated';uid:string|null;isAdmin:boolean;jwtAdminRole:string|null};
export type ShimRls={tables:Record<string,{rls:boolean}>;policies:Record<string,{name:string;cmd:string;roles:string[];using:string|null;check:string|null}[]>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Policy predicate for one command, or null when RLS does not apply (service role).
export function policySql(rls:ShimRls|undefined,auth:ShimAuth|null|undefined,tableKey:string,cmd:'SELECT'|'INSERT'|'UPDATE'|'DELETE',field:'using'|'check',alias:string){
 if(!auth)return null;
 if(!rls)return '0';
 if(rls.tables[tableKey]?.rls===false)return null;
 if(auth.uid!==null&&!UUID.test(auth.uid))return '0';
 const uid=auth.uid?`'${auth.uid.toLowerCase()}'`:'NULL',role=auth.jwtAdminRole&&/^(owner|editor|viewer|sale|support)$/.test(auth.jwtAdminRole)?`'${auth.jwtAdminRole}'`:'NULL';
 const parts=(rls.policies[tableKey]??[]).filter(p=>(p.cmd===cmd||p.cmd==='ALL')&&(p.roles.includes('public')||p.roles.includes(auth.role))).map(p=>{
  // FOR ALL / UPDATE without WITH CHECK reuse USING as the check (Postgres rule).
  const e=field==='check'?(p.check??p.using):p.using;return e;
 }).filter((e):e is string=>typeof e==='string');
 if(!parts.length)return '0';
 return '('+parts.map(e=>'('+e.replace(/\$UID/g,uid).replace(/\$IS_ADMIN/g,auth.isAdmin?'1':'0').replace(/\$JWT_ADMIN_ROLE/g,role).replace(/__row\./g,alias+'.')+')').join(' OR ')+')';
}
type Value=string|number|null;

export class ShimFailure extends Error{constructor(message:string,public code='PGRST000',public status=400){super(message);}}
const err=(e:unknown):ShimError=>e instanceof ShimFailure?{message:e.message,code:e.code,details:null,hint:null}:{message:mapSqliteMessage(e),code:sqliteCode(e),details:null,hint:null};
function sqliteCode(e:unknown){const m=String((e as Error)?.message??e);if(/CHECK constraint/i.test(m))return '23514';if(/UNIQUE constraint/i.test(m))return '23505';if(/FOREIGN KEY/i.test(m))return '23503';if(/NOT NULL constraint/i.test(m))return '23502';if(/stale course entity version/i.test(m))return '40001';if(/append-only/i.test(m))return '55000';if(/does not belong to course/i.test(m))return '23514';return 'D1000';}
function mapSqliteMessage(e:unknown){const c=sqliteCode(e);return c==='23505'?'duplicate key value violates unique constraint':c==='23503'?'violates foreign key constraint':c==='23502'?'null value violates not-null constraint':c==='23514'?'violates check constraint':'Database request failed';}

// ---------- value codec (Postgres JSON shape <-> SQLite storage) ----------
const BOOL=new Set(['bool']),JSONT=new Set(['json','jsonb']),INT=new Set(['int2','int4','int8']),NUM=new Set(['numeric','float4','float8']);
// Same shape as Postgres row_to_json timestamptz (UTC): fraction trimmed, +00:00.
export function pgTimestamp(value:unknown){
 if(value===null||value===undefined)return null;
 const raw=value instanceof Date?value.toISOString():String(value);
 const m=raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}(:?\d{2})?)?$/);
 if(!m)throw new ShimFailure(`invalid input syntax for type timestamp with time zone: "${raw.slice(0,40)}"`,'22007');
 const ms=Date.parse(`${m[1]}T${m[2]}${(m[3]??'').slice(0,4)}${m[4]?m[4].replace(/^([+-]\d{2})(\d{2})$/,'$1:$2'):'Z'}`);
 if(!Number.isFinite(ms))throw new ShimFailure('invalid timestamp','22007');
 const micro=((m[3]??'.').slice(1)+'000000').slice(0,6),d=new Date(ms),iso=d.toISOString();
 // Keep microseconds supplied by the caller when the zone is UTC.
 const frac=(!m[4]||/^(Z|\+00(:?00)?)$/.test(m[4]))?micro:iso.slice(20,23)+'000';
 const trimmed=frac.replace(/0+$/,'');
 return `${iso.slice(0,19)}${trimmed?'.'+trimmed:''}+00:00`;
}
function encode(udt:string,value:unknown):Value{
 if(value===null||value===undefined)return null;
 if(BOOL.has(udt)){if(typeof value==='boolean')return value?1:0;if(value==='true'||value==='t')return 1;if(value==='false'||value==='f')return 0;throw new ShimFailure(`invalid input syntax for type boolean: "${String(value)}"`,'22P02');}
 if(JSONT.has(udt))return JSON.stringify(value);
 if(udt.startsWith('_'))return JSON.stringify(Array.isArray(value)?value:parseArrayLiteral(String(value)));
 if(udt==='timestamptz'||udt==='timestamp')return pgTimestamp(value);
 if(INT.has(udt)){const n=typeof value==='number'?value:Number(value);if(!Number.isInteger(n))throw new ShimFailure(`invalid input syntax for type integer: "${String(value)}"`,'22P02');return n;}
 if(NUM.has(udt)){const n=typeof value==='number'?value:Number(value);if(!Number.isFinite(n))throw new ShimFailure(`invalid input syntax for type numeric: "${String(value)}"`,'22P02');return udt==='numeric'?String(value):n;}
 if(typeof value==='object')return JSON.stringify(value);
 return String(value);
}
function parseArrayLiteral(s:string){const t=s.trim();if(t.startsWith('['))return JSON.parse(t);if(!t.startsWith('{')||!t.endsWith('}'))return [t];const body=t.slice(1,-1);return body?body.split(',').map(x=>x.trim().replace(/^"(.*)"$/,'$1')):[];}
function decode(udt:string,value:unknown){
 if(value===null||value===undefined)return null;
 if(BOOL.has(udt))return value===1||value===true||value==='1';
 if(JSONT.has(udt)||udt.startsWith('_')){if(typeof value!=='string')return value;try{return JSON.parse(value);}catch{return value;}}
 if(NUM.has(udt)||INT.has(udt)){const n=Number(value);return Number.isFinite(n)?n:value;}
 return value;
}
// Filter literal for a column: same encoding as stored values.
function filterValue(udt:string|undefined,value:unknown):Value{
 if(value===null||value===undefined)return null;
 if(!udt)return typeof value==='number'?value:String(value);
 if(JSONT.has(udt)||udt.startsWith('_'))return typeof value==='string'?value:JSON.stringify(value);
 return encode(udt,value);
}

// ---------- defaults (Postgres column_default expressions) ----------
function nowStamp(now:number){return pgTimestamp(new Date(now).toISOString());}
export function evaluateDefault(expr:string,udt:string,now:number):unknown{
 const e=expr.trim();
 if(/^(now\(\)|clock_timestamp\(\)|CURRENT_TIMESTAMP|timezone\('utc'::text, now\(\)\))$/i.test(e))return udt==='date'?new Date(now).toISOString().slice(0,10):nowStamp(now);
 if(/^gen_random_uuid\(\)$|^uuid_generate_v4\(\)$|^extensions\.gen_random_uuid\(\)$/.test(e))return crypto.randomUUID();
 const iv=e.match(/^\(now\(\) \+ '(\d+) (days?|hours?|minutes?)'::interval\)$/);
 if(iv){const n=Number(iv[1]),u=iv[2].startsWith('day')?86400000:iv[2].startsWith('hour')?3600000:60000;return nowStamp(now+n*u);}
 if(e==='true'||e==='false')return e==='true';
 if(/^-?\d+(\.\d+)?$/.test(e))return Number(e);
 if(e==="CURRENT_DATE")return new Date(now).toISOString().slice(0,10);
 const lit=e.match(/^'((?:[^']|'')*)'::([\w ."\[\]]+)$/);
 if(lit){const v=lit[1].replace(/''/g,"'");if(lit[2].includes('json'))return JSON.parse(v);if(lit[2].endsWith('[]'))return parseArrayLiteral(v);if(/^(integer|bigint|smallint|numeric)$/.test(lit[2]))return Number(v);return v;}
 const arr=e.match(/^ARRAY\[([\s\S]*)\]$/);
 if(arr)return arr[1].split(',').map(x=>x.trim().replace(/^'((?:[^']|'')*)'::\w+$/,'$1').replace(/''/g,"'"));
 throw new ShimFailure(`Unsupported column default: ${e.slice(0,60)}`,'D1DEF',500);
}

// ---------- select parsing ----------
type SelectNode={kind:'star'}|{kind:'col';name:string;alias:string;path:string[];cast?:string}|{kind:'embed';relation:string;alias:string;hint?:string;inner:boolean;children:SelectNode[];count?:boolean};
function splitTop(s:string,sep=','){const out:string[]=[];let depth=0,cur='',q=false;for(const ch of s){if(ch==='"')q=!q;if(!q){if(ch==='(')depth++;else if(ch===')')depth--;else if(ch===sep&&depth===0){out.push(cur);cur='';continue;}}cur+=ch;}if(cur.trim())out.push(cur);return out.map(x=>x.trim()).filter(Boolean);}
export function parseSelect(input:string):SelectNode[]{
 const text=input.replace(/\s+/g,' ').trim()||'*';
 return splitTop(text).map(item=>{
  if(item==='*')return {kind:'star'};
  const open=item.indexOf('(');
  if(open>0&&item.endsWith(')')){
   let head=item.slice(0,open).trim(),alias='';const children=parseSelect(item.slice(open+1,-1));
   const colon=head.indexOf(':');if(colon>0){alias=head.slice(0,colon).trim();head=head.slice(colon+1).trim();}
   const [relation,...mods]=head.split('!');let inner=false,hint:string|undefined;
   for(const m of mods){if(m==='inner')inner=true;else if(m==='left'){}else hint=m;}
   if(relation==='count')return {kind:'embed',relation,alias:alias||'count',inner:false,children:[],count:true};
   return {kind:'embed',relation,alias:alias||relation,hint,inner,children};
  }
  let alias='',expr=item;const colon=item.search(/:(?!:)/);
  if(colon>0&&item[colon+1]!==':'){alias=item.slice(0,colon).trim();expr=item.slice(colon+1).trim();}
  let cast:string|undefined;const castAt=expr.indexOf('::');if(castAt>0){cast=expr.slice(castAt+2);expr=expr.slice(0,castAt);}
  const parts=expr.split(/->>?/),name=parts[0].trim();
  const path=parts.slice(1).map(p=>p.trim().replace(/^'(.*)'$/,'$1'));
  return {kind:'col',name,alias:alias||(path.length?path[path.length-1]:name),path,cast};
 });
}

// ---------- filters ----------
type Filter={sql:string;params:Value[]}|{embed:string;filter:RawFilter};
type RawFilter={column:string;op:string;value:unknown;negate?:boolean};
const VN_UPPER='ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐĨŨƠƯẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ';
export function vnLower(expr:string){let e=`lower(${expr})`;for(const ch of VN_UPPER)e=`replace(${e},'${ch}','${ch.toLocaleLowerCase('vi')}')`;return e;}
const LIKE_ESC=(v:string)=>v.replace(/\*/g,'%');

class Table{
 constructor(public schema:ShimSchema,public key:string,public prefix:string){}
 get meta(){const t=this.schema.tables[this.key];if(!t)throw new ShimFailure(`Could not find the table '${this.key}' in the schema cache`,'PGRST205',404);return t;}
 get sql(){const [s,t]=this.key.split('.');return `"${this.prefix}_${s}__${t}"`;}
 udt(column:string){return this.meta.cols[column]?.[0];}
 has(column:string){return Object.prototype.hasOwnProperty.call(this.meta.cols,column);}
 col(column:string,alias='t'){if(!this.has(column))throw new ShimFailure(`column ${this.key.split('.')[1]}.${column} does not exist`,'42703');return `${alias}."${column}"`;}
}

function columnExpr(table:Table,column:string,alias:string){
 // JSON path filters: metadata->>key / metadata->key
 const parts=column.split(/->>?/);
 if(parts.length===1)return {sql:table.col(column,alias),udt:table.udt(column)};
 const path=parts.slice(1).map(p=>p.trim().replace(/^'(.*)'$/,'$1'));
 if(path.some(p=>!/^[\w-]+$/.test(p)))throw new ShimFailure('Unsupported JSON path','PGRST100');
 return {sql:`json_extract(${table.col(parts[0].trim(),alias)},'$.${path.join('.')}')`,udt:column.includes('->>')?'text':'jsonb'};
}
function compile(table:Table,f:RawFilter,alias:string):{sql:string;params:Value[]}{
 const {sql:c,udt}=columnExpr(table,f.column,alias);let out:{sql:string;params:Value[]};
 const v=f.value;
 switch(f.op){
  case 'eq':out={sql:`${c} = ?`,params:[filterValue(udt,v)]};break;
  case 'neq':out={sql:`${c} <> ?`,params:[filterValue(udt,v)]};break;
  case 'gt':case 'gte':case 'lt':case 'lte':out={sql:`${c} ${({gt:'>',gte:'>=',lt:'<',lte:'<='} as Record<string,string>)[f.op]} ?`,params:[filterValue(udt,v)]};
   if(udt&&(INT.has(udt)||NUM.has(udt)))out={sql:`CAST(${c} AS REAL) ${({gt:'>',gte:'>=',lt:'<',lte:'<='} as Record<string,string>)[f.op]} ?`,params:[Number(v)]};break;
  case 'like':out={sql:`${c} GLOB ?`,params:[LIKE_ESC(String(v)).replace(/%/g,'*').replace(/_/g,'?')]};break;
  // SQLite lower()/LIKE fold ASCII only; fold Vietnamese capitals explicitly.
  case 'ilike':out={sql:`${vnLower(c)} LIKE ? ESCAPE '\\'`,params:[LIKE_ESC(String(v)).toLocaleLowerCase('vi')]};break;
  case 'is':{const s=v===null||v==='null'?'IS NULL':v===true||v==='true'?'= 1':v===false||v==='false'?'= 0':null;if(!s)throw new ShimFailure('invalid is value','PGRST100');out={sql:`${c} ${s}`,params:[]};break;}
  // One JSON parameter keeps any list size under the D1 bound-parameter limit.
  case 'in':{const list=(Array.isArray(v)?v:parseList(String(v))).map(x=>filterValue(udt,x));out={sql:`${c} IN (SELECT value FROM json_each(?))`,params:[JSON.stringify(list)]};break;}
  case 'cs':case 'contains':{const arr=Array.isArray(v)?v:parseList(String(v));out={sql:arr.map(()=>`EXISTS(SELECT 1 FROM json_each(${c}) WHERE value = ?)`).join(' AND ')||'1',params:arr.map(x=>x as Value)};break;}
  case 'ov':case 'overlaps':{const arr=Array.isArray(v)?v:parseList(String(v));out={sql:`EXISTS(SELECT 1 FROM json_each(${c}) WHERE value IN (${arr.map(()=>'?').join(',')||'NULL'}))`,params:arr.map(x=>x as Value)};break;}
  default:throw new ShimFailure(`Unsupported filter operator: ${f.op}`,'PGRST100');
 }
 // PostgREST: neq/not exclude NULLs like SQL three-valued logic (same as SQLite).
 return f.negate?{sql:`NOT (${out.sql})`,params:out.params}:out;
}
function parseList(s:string){const t=s.trim().replace(/^\(/,'').replace(/\)$/,'');return splitTop(t).map(x=>x.replace(/^"(.*)"$/,'$1'));}
// PostgREST logic tree: "a.eq.1,and(b.gt.2,c.is.null),d.not.ilike.*x*"
function parseLogic(table:Table,text:string,joiner:'OR'|'AND',alias:string):{sql:string;params:Value[]}{
 const parts=splitTop(text).map(item=>{
  const m=item.match(/^(not\.)?(and|or)\(([\s\S]*)\)$/);
  if(m){const inner=parseLogic(table,m[3],m[2]==='and'?'AND':'OR',alias);return m[1]?{sql:`NOT (${inner.sql})`,params:inner.params}:inner;}
  const seg=item.match(/^([^.]+(?:->>?[^.]+)*)\.(not\.)?(\w+)\.([\s\S]*)$/);
  if(!seg)throw new ShimFailure(`Unsupported logic filter: ${item.slice(0,60)}`,'PGRST100');
  let value:unknown=seg[4];if(seg[3]==='in')value=parseList(seg[4]);else if(typeof value==='string')value=value.replace(/^"(.*)"$/,'$1');
  if(seg[3]==='like'||seg[3]==='ilike')value=String(value);
  return compile(table,{column:seg[1],op:seg[3],value,negate:!!seg[2]},alias);
 });
 return {sql:'('+parts.map(p=>p.sql).join(` ${joiner} `)+')',params:parts.flatMap(p=>p.params)};
}

// ---------- relations ----------
type Relation={table:string;many:boolean;localCols:string[];remoteCols:string[]};
function resolveRelation(schema:ShimSchema,from:string,name:string,hint?:string):Relation{
 const candidates:Relation[]=[];const [fs]=from.split('.');
 const target=Object.keys(schema.tables).filter(k=>k.split('.')[1]===name).sort((a,b)=>(a.startsWith(fs+'.')?-1:0)-(b.startsWith(fs+'.')?-1:0));
 for(const fk of schema.tables[from].fks){
  // many-to-one: from.fk -> target
  if(target.includes(fk.ref)&&(!hint||hint===fk.name||fk.cols.includes(hint)))candidates.push({table:fk.ref,many:false,localCols:fk.cols,remoteCols:fk.refCols});
 }
 for(const t of target)for(const fk of schema.tables[t].fks){
  if(fk.ref===from&&(!hint||hint===fk.name||fk.cols.includes(hint)))candidates.push({table:t,many:true,localCols:fk.refCols,remoteCols:fk.cols});
 }
 // Column-named embed: e.g. "owner:owner_id(...)".
 if(!candidates.length){const fk=schema.tables[from].fks.find(f=>f.cols.length===1&&f.cols[0]===name);if(fk)candidates.push({table:fk.ref,many:false,localCols:fk.cols,remoteCols:fk.refCols});}
 const sameSchema=candidates.filter(c=>c.table.startsWith(fs+'.'));const list=sameSchema.length?sameSchema:candidates;
 if(list.length!==1)throw new ShimFailure(list.length?`Could not embed because more than one relationship was found for '${from.split('.')[1]}' and '${name}'`:`Could not find a relationship between '${from.split('.')[1]}' and '${name}' in the schema cache`,list.length?'PGRST201':'PGRST200');
 return list[0];
}

type Order={column:string;ascending:boolean;nullsFirst?:boolean;referencedTable?:string};
type EmbedOptions={filters:Map<string,RawFilter[]>;orders:Map<string,Order[]>;limits:Map<string,{limit?:number;offset?:number}>};

export class D1PostgrestClient{
 constructor(public db:ShimDatabase,public schemaJson:ShimSchema,public options:{prefix:string;defaultSchema?:string;rpc?:Record<string,ShimRpc>;now?:()=>number;auth?:ShimAuth|null;rls?:ShimRls}){}
 policy(tableKey:string,cmd:'SELECT'|'INSERT'|'UPDATE'|'DELETE',field:'using'|'check',alias:string){return policySql(this.options.rls,this.options.auth,tableKey,cmd,field,alias);}
 private schemaName=this.options.defaultSchema??'public';
 now(){return (this.options.now??Date.now)();}
 schema(name:string){const c=new D1PostgrestClient(this.db,this.schemaJson,this.options);c.schemaName=name;return c;}
 from(table:string){return new QueryBuilder(this,new Table(this.schemaJson,table.includes('.')?table:`${this.schemaName}.${table}`,this.options.prefix));}
 table(key:string){return new Table(this.schemaJson,key,this.options.prefix);}
 rpc(name:string,args:Record<string,unknown>={},_options?:{count?:string;head?:boolean}):PromiseLike<ShimResult>&{single:()=>PromiseLike<ShimResult>;maybeSingle:()=>PromiseLike<ShimResult>}{
  const run=async(mode?:'single'|'maybe'):Promise<ShimResult>=>{
   const fn=this.options.rpc?.[name]??this.options.rpc?.[`${this.schemaName}.${name}`];
   if(!fn)return {data:null,error:{message:`Could not find the function ${this.schemaName}.${name} in the schema cache`,code:'PGRST202',details:null,hint:null},count:null,status:404,statusText:'Not Found'};
   // Postgres RPCs here are SECURITY DEFINER: they run without RLS and check the
   // caller themselves from `auth`.
   const definer=this.options.auth?new D1PostgrestClient(this.db,this.schemaJson,{...this.options,auth:null}).schema(this.schemaName):this;
   try{let data=await fn(args,{client:definer,now:()=>this.now(),auth:this.options.auth??null});if(mode&&Array.isArray(data)){if(data.length>1||(mode==='single'&&!data.length))throw new ShimFailure('JSON object requested, multiple (or no) rows returned','PGRST116',406);data=data[0]??null;}return {data:data as unknown,error:null,count:null,status:200,statusText:'OK'};}
   catch(e){return {data:null,error:err(e),count:null,status:e instanceof ShimFailure?e.status:400,statusText:'Error'};}
  };
  const p=run();return {then:(a,b)=>p.then(a,b),single:()=>run('single'),maybeSingle:()=>run('maybe')};
 }
 async query(sql:string,params:Value[]){return this.db.all(sql,params);}
}

type Op='select'|'insert'|'update'|'upsert'|'delete';
export class QueryBuilder implements PromiseLike<ShimResult>{
 private op:Op='select';private columns='*';private returning=false;private filters:Filter[]=[];private orders:Order[]=[];
 private limitN?:number;private offsetN?:number;private mode:'many'|'single'|'maybe'='many';private countMode?:string;private head=false;
 private payload:ShimRow[]=[];private patch:ShimRow={};private onConflict?:string;private ignoreDuplicates=false;private defaultToNull=true;private csvMode=false;
 private embed:EmbedOptions={filters:new Map(),orders:new Map(),limits:new Map()};private throwing=false;
 constructor(private client:D1PostgrestClient,private table:Table){}
 select(columns='*',options:{count?:string;head?:boolean}={}){if(this.op==='select')this.columns=columns;else{this.returning=true;this.columns=columns;}if(options.count)this.countMode=options.count;if(options.head)this.head=true;return this;}
 insert(values:ShimRow|ShimRow[],options:{count?:string;defaultToNull?:boolean}={}){this.op='insert';this.payload=Array.isArray(values)?values:[values];if(options.count)this.countMode=options.count;if(options.defaultToNull===false)this.defaultToNull=false;return this;}
 upsert(values:ShimRow|ShimRow[],options:{onConflict?:string;ignoreDuplicates?:boolean;count?:string;defaultToNull?:boolean}={}){this.op='upsert';this.payload=Array.isArray(values)?values:[values];this.onConflict=options.onConflict;this.ignoreDuplicates=!!options.ignoreDuplicates;if(options.defaultToNull===false)this.defaultToNull=false;return this;}
 update(values:ShimRow,options:{count?:string}={}){this.op='update';this.patch=values;if(options.count)this.countMode=options.count;return this;}
 delete(options:{count?:string}={}){this.op='delete';if(options.count)this.countMode=options.count;return this;}
 private add(column:string,op:string,value:unknown,negate=false){
  const dot=column.indexOf('.');
  if(dot>0&&!column.includes('->')){const rel=column.slice(0,dot),list=this.embed.filters.get(rel)??[];list.push({column:column.slice(dot+1),op,value,negate});this.embed.filters.set(rel,list);this.filters.push({embed:rel,filter:{column:column.slice(dot+1),op,value,negate}});return this;}
  this.filters.push(compile(this.table,{column,op,value,negate},'t'));return this;
 }
 eq(c:string,v:unknown){return this.add(c,'eq',v);} neq(c:string,v:unknown){return this.add(c,'neq',v);}
 gt(c:string,v:unknown){return this.add(c,'gt',v);} gte(c:string,v:unknown){return this.add(c,'gte',v);}
 lt(c:string,v:unknown){return this.add(c,'lt',v);} lte(c:string,v:unknown){return this.add(c,'lte',v);}
 like(c:string,v:string){return this.add(c,'like',v);} ilike(c:string,v:string){return this.add(c,'ilike',v);}
 is(c:string,v:unknown){return this.add(c,'is',v);} in(c:string,v:unknown[]){return this.add(c,'in',v);}
 contains(c:string,v:unknown){return this.add(c,'cs',v);} overlaps(c:string,v:unknown){return this.add(c,'ov',v);}
 match(o:ShimRow){for(const [k,v] of Object.entries(o))this.eq(k,v);return this;}
 not(c:string,op:string,v:unknown){if(op==='in'&&typeof v==='string')v=parseList(v);return this.add(c,op,v,true);}
 filter(c:string,op:string,v:unknown){if(op.startsWith('not.'))return this.not(c,op.slice(4),v);if(op==='in'&&typeof v==='string')v=parseList(v);return this.add(c,op,v);}
 or(text:string,options:{foreignTable?:string;referencedTable?:string}={}){
  const rel=options.referencedTable??options.foreignTable;
  if(rel)throw new ShimFailure('or() on embedded resources is not supported','PGRST100');
  this.filters.push(parseLogic(this.table,text,'OR','t'));return this;
 }
 order(column:string,options:{ascending?:boolean;nullsFirst?:boolean;foreignTable?:string;referencedTable?:string}={}){
  const rel=options.referencedTable??options.foreignTable,o={column,ascending:options.ascending!==false,nullsFirst:options.nullsFirst};
  if(rel){const list=this.embed.orders.get(rel)??[];list.push(o);this.embed.orders.set(rel,list);}else this.orders.push(o);return this;
 }
 limit(n:number,options:{foreignTable?:string;referencedTable?:string}={}){const rel=options.referencedTable??options.foreignTable;if(rel){this.embed.limits.set(rel,{...this.embed.limits.get(rel),limit:n});}else this.limitN=n;return this;}
 range(from:number,to:number,options:{foreignTable?:string;referencedTable?:string}={}){const rel=options.referencedTable??options.foreignTable;if(rel){this.embed.limits.set(rel,{offset:from,limit:to-from+1});}else{this.offsetN=from;this.limitN=to-from+1;}return this;}
 single(){this.mode='single';return this;} maybeSingle(){this.mode='maybe';return this;}
 csv(){this.csvMode=true;return this;} returns(){return this;} abortSignal(){return this;} throwOnError(){this.throwing=true;return this;}
 then<A=ShimResult,B=never>(ok?:((v:ShimResult)=>A|PromiseLike<A>)|null,fail?:((e:unknown)=>B|PromiseLike<B>)|null){return this.execute().then(ok,fail);}

 private where(cmd:'SELECT'|'UPDATE'|'DELETE'='SELECT'){
  const own=this.filters.filter((f):f is {sql:string;params:Value[]}=>'sql' in f);
  const rls=this.client.policy(this.table.key,cmd,'using','t');if(rls)own.push({sql:rls,params:[]});
  // !inner embeds with filters restrict the parent rows (PostgREST semantics).
  const parts=[...own];
  for(const node of parseSelect(this.columns)){
   if(node.kind!=='embed'||node.count)continue;const fs=this.embed.filters.get(node.alias)??this.embed.filters.get(node.relation);
   if(!node.inner&&!fs?.length)continue;if(!node.inner)continue;
   const rel=resolveRelation(this.table.schema,this.table.key,node.relation,node.hint),child=this.client.table(rel.table);
   const join=rel.localCols.map((c,i)=>`c."${rel.remoteCols[i]}" = t."${c}"`).join(' AND ');
   const inner=(fs??[]).map(f=>compile(child,f,'c'));const cp=this.client.policy(child.key,'SELECT','using','c');if(cp)inner.push({sql:cp,params:[]});
   parts.push({sql:`EXISTS(SELECT 1 FROM ${child.sql} c WHERE ${join}${inner.map(x=>' AND '+x.sql).join('')})`,params:inner.flatMap(x=>x.params)});
  }
  return {sql:parts.length?' WHERE '+parts.map(p=>p.sql).join(' AND '):'',params:parts.flatMap(p=>p.params)};
 }
 private orderSql(table:Table,orders:Order[],alias='t'){
  if(!orders.length)return '';
  return ' ORDER BY '+orders.map(o=>{const e=columnExpr(table,o.column,alias),c=e.udt&&NUM.has(e.udt)?`CAST(${e.sql} AS REAL)`:e.sql;const nulls=o.nullsFirst===undefined?(o.ascending?'NULLS LAST':'NULLS FIRST'):o.nullsFirst?'NULLS FIRST':'NULLS LAST';return `${c} ${o.ascending?'ASC':'DESC'} ${nulls}`;}).join(', ');
 }
 private async execute():Promise<ShimResult>{
  try{
   const result=await this.run();
   if(this.throwing&&result.error)throw new Error(result.error.message);
   return result;
  }catch(e){if(this.throwing)throw e;return {data:null,error:err(e),count:null,status:e instanceof ShimFailure?e.status:400,statusText:'Error'};}
 }
 private finish(rows:ShimRow[],count:number|null):ShimResult{
  if(this.head)return {data:null,error:null,count,status:200,statusText:'OK'};
  if(this.mode!=='many'&&(this.op==='select'||this.returning)){
   if(rows.length>1||(this.mode==='single'&&rows.length===0))return {data:null,error:{message:'JSON object requested, multiple (or no) rows returned',code:'PGRST116',details:`The result contains ${rows.length} rows`,hint:null},count,status:406,statusText:'Not Acceptable'};
   return {data:rows[0]??null,error:null,count,status:200,statusText:'OK'};
  }
  // Mutations without .select() return data null (PostgREST return=minimal).
  if(this.op!=='select'&&!this.returning)return {data:null,error:null,count,status:this.op==='insert'||this.op==='upsert'?201:204,statusText:'OK'};
  return {data:rows,error:null,count,status:this.op==='insert'||this.op==='upsert'?201:200,statusText:'OK'};
 }
 private async run():Promise<ShimResult>{
  if(this.op==='select')return this.runSelect();
  if(this.op==='delete')return this.runDelete();
  if(this.op==='update')return this.runUpdate();
  return this.runInsert();
 }
 private async runSelect(){
  const w=this.where();let count:number|null=null;
  if(this.countMode){const r=await this.client.query(`SELECT count(*) AS n FROM ${this.table.sql} t${w.sql}`,w.params);count=Number(r[0]?.n??0);}
  if(this.head)return this.finish([],count);
  let sql=`SELECT t.* FROM ${this.table.sql} t${w.sql}${this.orderSql(this.table,this.orders)}`;
  if(this.limitN!==undefined)sql+=` LIMIT ${Math.max(0,Math.floor(this.limitN))}`;else if(this.offsetN)sql+=' LIMIT -1';
  if(this.offsetN)sql+=` OFFSET ${Math.max(0,Math.floor(this.offsetN))}`;
  const rows=await this.client.query(sql,w.params);
  return this.finish(await this.shape(this.table,rows,parseSelect(this.columns),''),count);
 }
 // Shapes raw rows into the selected PostgREST JSON, loading embeds in batches.
 private async shape(table:Table,rows:ShimRow[],nodes:SelectNode[],path:string):Promise<ShimRow[]>{
  const out=rows.map(()=>({} as ShimRow));
  for(const node of nodes){
   if(node.kind==='star'){rows.forEach((r,i)=>{for(const [c,m] of Object.entries(table.meta.cols))out[i][c]=decode(m[0],r[c]);});continue;}
   if(node.kind==='col'){
    if(!table.has(node.name))throw new ShimFailure(`column ${table.key.split('.')[1]}.${node.name} does not exist`,'42703');
    const udt=table.udt(node.name)!;
    rows.forEach((r,i)=>{let v=decode(udt,r[node.name]);for(const p of node.path)v=v&&typeof v==='object'?(v as ShimRow)[p]??null:null;if(node.path.length&&v!==null&&typeof v==='object'&&node.cast==='text')v=JSON.stringify(v);if(node.cast==='text'&&v!==null&&typeof v!=='string')v=String(v);if(node.cast&&/^(int|integer|bigint|numeric)$/.test(node.cast)&&v!==null)v=Number(v);out[i][node.alias]=v;});continue;
   }
   if(node.count){rows.forEach((_,i)=>{out[i][node.alias]=[{count:0}];});continue;}
   const key=path?`${path}.${node.alias}`:node.alias;
   const rel=resolveRelation(table.schema,table.key,node.relation,node.hint),child=this.client.table(rel.table);
   const filters=(this.embed.filters.get(key)??this.embed.filters.get(node.relation)??[]).map(f=>compile(child,f,'c'));
   const childPolicy=this.client.policy(child.key,'SELECT','using','c');if(childPolicy)filters.push({sql:childPolicy,params:[]});
   const orders=this.embed.orders.get(key)??this.embed.orders.get(node.relation)??[],lim=this.embed.limits.get(key)??this.embed.limits.get(node.relation);
   const keyOf=(r:ShimRow,cols:string[])=>JSON.stringify(cols.map(c=>r[c]??null));
   const wanted=Array.from(new Set(rows.filter(r=>rel.localCols.every(c=>r[c]!==null&&r[c]!==undefined)).map(r=>keyOf(r,rel.localCols))));
   if(rel.localCols.length!==1)throw new ShimFailure('Composite-key embeds are not supported','PGRST100');
   const ids=wanted.map(k=>JSON.parse(k)[0] as Value);
   // Aggregate embed: relation(count) -> [{count:n}] like PostgREST.
   if(node.children.length===1&&node.children[0].kind==='col'&&node.children[0].name==='count'&&!child.has('count')){
    const counts=new Map<string,number>();
    if(ids.length){const r=await this.client.query(`SELECT c."${rel.remoteCols[0]}" AS k,count(*) AS n FROM ${child.sql} c WHERE c."${rel.remoteCols[0]}" IN (SELECT value FROM json_each(?))${filters.map(f=>' AND '+f.sql).join('')} GROUP BY 1`,[JSON.stringify(ids),...filters.flatMap(f=>f.params)]);for(const x of r)counts.set(JSON.stringify([x.k]),Number(x.n));}
    rows.forEach((r,i)=>{const n=counts.get(keyOf(r,rel.localCols))??0;out[i][node.alias]=rel.many?[{count:n}]:{count:n};});continue;
   }
   const children:ShimRow[]=ids.length?await this.client.query(`SELECT c.* FROM ${child.sql} c WHERE c."${rel.remoteCols[0]}" IN (SELECT value FROM json_each(?))${filters.map(f=>' AND '+f.sql).join('')}${this.orderSql(child,orders,'c')}`,[JSON.stringify(ids),...filters.flatMap(f=>f.params)]):[];
   const shaped=await this.shape(child,children,node.children.length?node.children:[{kind:'star'}],key);
   const groups=new Map<string,ShimRow[]>();
   children.forEach((c,i)=>{const k=keyOf(c,rel.remoteCols);const g=groups.get(k)??[];g.push(shaped[i]);groups.set(k,g);});
   rows.forEach((r,i)=>{
    let g=groups.get(keyOf(r,rel.localCols))??[];
    if(lim){g=g.slice(lim.offset??0,(lim.offset??0)+(lim.limit??g.length));}
    out[i][node.alias]=rel.many?g:(g[0]??null);
   });
   // !inner without matching children removes the parent row (only reachable when
   // embed filters were applied on a nested level).
   if(node.inner){for(let i=rows.length-1;i>=0;i--){const v=out[i][node.alias];if(v===null||(Array.isArray(v)&&!v.length)){out.splice(i,1);rows.splice(i,1);}}}
  }
  return out;
 }
 private assertColumns(row:ShimRow){for(const k of Object.keys(row))if(!this.table.has(k))throw new ShimFailure(`Could not find the '${k}' column of '${this.table.key.split('.')[1]}' in the schema cache`,'PGRST204');}
 private prepareInsert(row:ShimRow,columns:string[]){
  const now=this.client.now(),values:Value[]=[];
  for(const c of columns){
   const [udt,def]=this.table.meta.cols[c];let v=row[c];
   if(v===undefined)v=def&&(!this.defaultToNull||!(c in row))?evaluateDefault(def,udt,now):null;
   values.push(encode(udt,v));
  }
  return values;
 }
 private async returningRows(pkValues:ShimRow[]){
  if(!this.returning&&!this.countMode)return {rows:[] as ShimRow[],count:this.countMode?pkValues.length:null};
  const pk=this.table.meta.pk;if(!pk.length)throw new ShimFailure('Returning requires a primary key','D1PK',500);
  const rows:ShimRow[]=[];
  for(const key of pkValues){const r=await this.client.query(`SELECT t.* FROM ${this.table.sql} t WHERE ${pk.map(c=>`t."${c}" = ?`).join(' AND ')}`,pk.map(c=>key[c] as Value));if(r[0])rows.push(r[0]);}
  return {rows:this.returning?await this.shape(this.table,rows,parseSelect(this.columns),''):[],count:this.countMode?pkValues.length:null};
 }
 private async runInsert(){
  if(!this.payload.length)return this.finish([],this.countMode?0:null);
  this.payload.forEach(r=>this.assertColumns(r));
  // PostgREST bulk insert uses the union of keys; missing keys take the default.
  const keys=Array.from(new Set(this.payload.flatMap(r=>Object.keys(r))));
  const meta=this.table.meta,columns=Object.keys(meta.cols).filter(c=>keys.includes(c)||meta.cols[c][1]!==null);
  let conflict:string[]|null=null;
  if(this.op==='upsert'){conflict=(this.onConflict??meta.pk.join(',')).split(',').map(s=>s.trim()).filter(Boolean);if(!conflict.length)throw new ShimFailure('upsert requires a conflict target','42P10');}
  const pkRows:ShimRow[]=[];
  for(const row of this.payload){
   // Explicit keys win over defaults; on upsert-update only supplied keys change.
   const cols=this.op==='upsert'?columns.filter(c=>c in row||!this.isConflictUpdateOnly(c,row)):columns;
   const values=this.prepareInsert(row,cols);
   const check=this.client.policy(this.table.key,'INSERT','check','__row');
   if(check&&conflict)throw new ShimFailure('upsert is not available for this role','42501',403);
   // RLS WITH CHECK is evaluated on the new row itself before it is written.
   let sql=check?`INSERT INTO ${this.table.sql} (${cols.map(c=>`"${c}"`).join(',')}) SELECT * FROM (SELECT ${cols.map(c=>`? AS "${c}"`).join(',')}) AS __row WHERE ${check}`
    :`INSERT INTO ${this.table.sql} (${cols.map(c=>`"${c}"`).join(',')}) VALUES (${cols.map(()=>'?').join(',')})`;
   if(conflict){
    const target=this.conflictTarget(conflict);
    const updatable=Object.keys(row).filter(c=>!conflict!.includes(c));
    sql+=this.ignoreDuplicates||!updatable.length?` ON CONFLICT${target} DO NOTHING`:` ON CONFLICT${target} DO UPDATE SET ${updatable.map(c=>`"${c}"=excluded."${c}"`).join(',')}`;
   }
   sql+=` RETURNING ${meta.pk.length?meta.pk.map(c=>`"${c}"`).join(','):'rowid'}`;
   if(values.length>100)throw new ShimFailure('Too many columns for one D1 statement','D1PARAM',500);
   const r=await this.client.query(sql,values);
   if(check&&!r[0])throw new ShimFailure('new row violates row-level security policy','42501',403);
   if(r[0])pkRows.push(r[0]);
   else if(conflict&&this.ignoreDuplicates===false){/* DO NOTHING when no updatable column: row exists */
    const existing=await this.client.query(`SELECT ${meta.pk.map(c=>`"${c}"`).join(',')} FROM ${this.table.sql} WHERE ${conflict.map(c=>`"${c}" IS ?`).join(' AND ')}`,conflict.map(c=>encode(meta.cols[c][0],row[c])));if(existing[0])pkRows.push(existing[0]);
   }
  }
  const {rows,count}=await this.returningRows(pkRows);
  return this.finish(rows,count);
 }
 private isConflictUpdateOnly(_c:string,_row:ShimRow){return false;}
 private conflictTarget(cols:string[]){
  const meta=this.table.meta;
  if(meta.pk.length===cols.length&&meta.pk.every(c=>cols.includes(c)))return `(${cols.map(c=>`"${c}"`).join(',')})`;
  const u=meta.uniques.find(x=>x.cols.length===cols.length&&x.cols.every(c=>cols.includes(c)));
  if(!u)throw new ShimFailure('there is no unique or exclusion constraint matching the ON CONFLICT specification','42P10');
  // Partial unique index: SQLite needs the same WHERE on the conflict target.
  const where=u.where?' WHERE '+u.where.replace(/::\w+/g,'').replace(/^\((.*)\)$/,'$1'):'';
  return `(${cols.map(c=>`"${c}"`).join(',')})${where}`;
 }
 private async runUpdate(){
  this.assertColumns(this.patch);
  // BEFORE UPDATE enforce_version_update sets updated_at=now() in Postgres.
  if((this.table.meta.triggers??[]).some(t=>/enforce_version_update$/.test(t.function))&&this.table.has('updated_at'))this.patch={...this.patch,updated_at:pgTimestamp(new Date(this.client.now()).toISOString())};
  const keys=Object.keys(this.patch);if(!keys.length)throw new ShimFailure('Update requires at least one column','PGRST100');
  const w=this.where('UPDATE'),meta=this.table.meta;
  // WITH CHECK that depends on row columns cannot be re-evaluated on the new row
  // here; refuse such patches for non-service callers instead of guessing.
  // No visible rows (USING denies everything): Postgres updates 0 rows, no error.
  if(this.client.policy(this.table.key,'UPDATE','using','t')==='0')return this.finish([],this.countMode?0:null);
  const check=this.client.policy(this.table.key,'UPDATE','check','t');
  if(check&&check!=='0'&&keys.some(k=>new RegExp(`(^|[^\\w])(t\\.)?"?${k}"?([^\\w]|$)`).test(check)))throw new ShimFailure('new row violates row-level security policy','42501',403);
  if(check==='0')throw new ShimFailure('new row violates row-level security policy','42501',403);
  if(check)w.sql+=(w.sql?' AND ':' WHERE ')+check;
  const set=keys.map(c=>`"${c}" = ?`).join(', '),values=keys.map(c=>encode(meta.cols[c][0],this.patch[c]));
  const pk=meta.pk.length?meta.pk:['rowid'];
  const sql=`UPDATE ${this.table.sql} AS t SET ${set}${w.sql} RETURNING ${pk.map(c=>`"${c}"`).join(',')}`;
  if(values.length+w.params.length>100)throw new ShimFailure('Too many parameters for one D1 statement','D1PARAM',500);
  const rows=await this.client.query(sql,[...values,...w.params]);
  const r=await this.returningRows(rows);
  return this.finish(r.rows,r.count);
 }
 private async runDelete(){
  const w=this.where('DELETE'),meta=this.table.meta,pk=meta.pk.length?meta.pk:['rowid'];
  // Capture returning rows before delete when requested.
  let before:ShimRow[]=[];
  if(this.returning){const raw=await this.client.query(`SELECT t.* FROM ${this.table.sql} t${w.sql}`,w.params);before=await this.shape(this.table,raw,parseSelect(this.columns),'');}
  const rows=await this.client.query(`DELETE FROM ${this.table.sql} AS t${w.sql} RETURNING ${pk.map(c=>`"${c}"`).join(',')}`,w.params);
  return this.finish(this.returning?before:[],this.countMode?rows.length:null);
 }
}

export function resolveRelationForAudit(schema:ShimSchema,from:string,name:string,hint?:string){return resolveRelation(schema,from,name,hint);}
export function createD1PostgrestClient(db:ShimDatabase,schema:ShimSchema,options:{prefix:string;rpc?:Record<string,ShimRpc>;now?:()=>number;auth?:ShimAuth|null;rls?:ShimRls}){return new D1PostgrestClient(db,schema,options);}
