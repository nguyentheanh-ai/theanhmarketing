// Owner-authorized QA mail only. Password/link remain in memory and private
// owner/QA email; never stdout, reports, CLI arguments, or Git.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parseEnv} from 'node:util';
import {createClient} from '@supabase/supabase-js';
if(process.argv.slice(2).join(' ')!=='--send-qa'){console.log('PLAN_ONLY: send one QA Safari iPhone checklist to the existing owner QA alias');process.exit(0);}
const receiptPath='reports/cloudflare-handoff-20261018/iphone-qa-instructions.json';
if(fs.existsSync(receiptPath)&&JSON.parse(fs.readFileSync(receiptPath,'utf8')).providerAccepted){console.log('ALREADY_SUBMITTED: QA instructions not sent twice');process.exit(0);}
const qa=JSON.parse(fs.readFileSync('/private/tmp/theanh-cf-qa-20261013.json','utf8'));
if(!qa.email?.includes('+cloudflare-qa-')||qa.email.replace(/\+[^@]+/,'')!=='12c1thdtheanh@gmail.com'||!qa.password)throw Error('OWNER_QA_ALIAS_REQUIRED');
const keys=parseEnv(execFileSync('/usr/bin/textutil',['-convert','txt','-stdout',process.env.HOME+'/Documents/key.rtf'],{encoding:'utf8'}));
const key=keys.SUPABASE_SERVICE_ROLE_KEY?.trim(),claims=JSON.parse(Buffer.from(key?.split('.')[1]??'','base64url').toString());
if(claims.ref!=='pppiqhkectojxbmhqcnx'||claims.role!=='service_role')throw Error('WRONG_PROJECT');
const admin=createClient('https://pppiqhkectojxbmhqcnx.supabase.co',key,{auth:{persistSession:false,autoRefreshToken:false}});
const profile=await admin.from('profiles').select('id,status,role').eq('email',qa.email).single();
if(profile.error||profile.data.status!=='active'||profile.data.role!=='student')throw Error('ACTIVE_QA_REQUIRED');
const appOrigin='https://theanh-student-cf-production.12c1thdtheanh.workers.dev';
const generated=await admin.auth.admin.generateLink({type:'magiclink',email:qa.email,options:{redirectTo:appOrigin+'/auth/callback?source=website'}});
if(generated.error||generated.data.user.id!==profile.data.id)throw Error('QA_LINK_FAILED');
const link=new URL(generated.data.properties.action_link);
if(link.origin!=='https://pppiqhkectojxbmhqcnx.supabase.co'||new URL(link.searchParams.get('redirect_to')).origin!==appOrigin)throw Error('QA_LINK_ORIGIN_MISMATCH');
const origin='https://theanh-main-cf-production.12c1thdtheanh.workers.dev';
const lesson=origin+'/learn/facebook-ads-2026/47da65a2-c6c6-4a21-a109-c1feb1d64c8f';
const text=[
'Anh kiểm thử bằng Safari trên iPhone (không dùng trình duyệt bên trong Gmail/Facebook). Đây là tài khoản QA riêng, không phải tài khoản học viên thật.',
'', '1. Mở bài học trên Safari:',lesson,'Nếu cần, đăng nhập bằng tài khoản thử dưới đây:',`Email: ${qa.email}`,`Mật khẩu QA: ${qa.password}`,
'', '2. Bấm phát video khoảng30giây, bấm Bài tiếp theo, Bài trước rồi tải lại trang. Bài đầu đã hoàn thành phải vẫn hiện Đã hoàn thành.',
'', '3. Mở Ebook đã cấp cho QA, kiểm trang đọc và tải PDF:',origin+'/thu-vien/facebook-ads',
'', '4. App B là ứng dụng riêng. Mở liên kết đăng nhập QA dùng một lần này bằng Safari, sau đó tải lại trang xem còn đăng nhập không:',link.toString(),
'', 'Trả lời trong cuộc chat Codex: Safari đạt, hoặc gửi ảnh màn hình lỗi. Không gửi mật khẩu/link đăng nhập qua chat; không chuyển tiền hay bấm thanh toán thật.',
'Chưa chuyển domain chính. Sau khi đạt các điều kiện an toàn, em sẽ thực hiện theo gói chuyển đã được anh duyệt.',
].join('\n');
const resend=execFileSync('/usr/bin/security',['find-generic-password','-s','com.theanhmarketing.resend.production','-w'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
if(!resend.startsWith('re_'))throw Error('SAVED_SENDER_REQUIRED');
const r=await fetch('https://api.resend.com/emails',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),headers:{authorization:'Bearer '+resend,'content-type':'application/json','idempotency-key':'tam-cf-iphone-qa-owner-20261018'},body:JSON.stringify({from:'The Anh Marketing <noreply@theanhmarketing.com>',to:qa.email,subject:'[QA Cloudflare] Kiểm Safari iPhone — tài khoản thử riêng',text})});
const data=await r.json().catch(()=>null);if(!r.ok||typeof data?.id!=='string')throw Error('QA_MAIL_NOT_ACCEPTED');
const receipt={checkedAt:new Date().toISOString(),providerAccepted:true,messageId:data.id,purpose:'Owner QA Safari iPhone checklist; no customer recipient',actualSafariResult:'PENDING_OWNER_DEVICE',credentialsPrinted:false};
fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
