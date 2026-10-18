import {getNativeRequestContext} from '@/lib/cloudflare/native-request-context';
import {resolveNativeStageOptions} from '@/lib/cloudflare/native-stage-router';
import {readD1SessionCookie} from '@/lib/cloudflare/d1-auth-http';
import {readD1StudentSessionProgress} from '@/lib/cloudflare/d1-student-session-access';
import {readD1StudentPublicCatalog} from '@/lib/cloudflare/d1-student-public-catalog';
import {logD1StudentDashboardVisit} from '@/lib/cloudflare/d1-student-dashboard-activity';
import {readNativeUiAuthContext} from '@/lib/cloudflare/native-ui-auth-context';
import {getD1AuthSession} from '@/lib/cloudflare/d1-auth-core';
function options(){
 const context=getNativeRequestContext();if(!context||!['/dashboard','/tai-khoan'].includes(new URL(context.request.url).pathname))return null;
 const settings=resolveNativeStageOptions(context.request,context.env);return settings?{context,settings}:null;
}
export function nativeDashboardProvider(){return options()?'native-d1' as const:'supabase' as const;}
// Guard the layout before its loading boundary can stream a 200 response.
// The later data query still rechecks session/version/cohort atomically.
export async function readNativeDashboardAuth(){
 const native=options();if(!native)return null;
 const session=await getD1AuthSession(native.settings.db,readD1SessionCookie(native.context.request),{...native.settings,projectId:'vsxxgdzwtscuxcmjfckt'});
 return !session?'guest' as const:session.user.mustChangePassword?'password-change-required' as const:'authenticated' as const;
}
// Isolated staging QA route only. Once selected, no Source/fallback authority.
export async function readNativeDashboardPage(){
 const native=options();if(!native)return null;
 const {context,settings}=native,token=readD1SessionCookie(context.request);
 const result=await readD1StudentSessionProgress(settings.db,token,settings);
 if(result.status!=='student')return result;
 if(!result.dashboardProgress||!result.studentProfile)throw Error('Native dashboard unavailable');
 const catalog=await readD1StudentPublicCatalog(settings.db),authContext=await readNativeUiAuthContext();
 const displayName=result.studentProfile.fullName.trim()||result.user.email.split('@')[0]||'học viên';
 return {status:'student' as const,...catalog,ownedSlugs:result.access.ownedSlugs,progressBySlug:result.dashboardProgress.progressBySlug,lessonCountsBySlug:result.dashboardProgress.lessonCountsBySlug,
  displayName,email:result.user.email,phone:result.studentProfile.phone,authContext,
  // Backend closure only, never pass to a Client Component. Same QA write gate
  // as progress; a read-only QA run deliberately does not insert activity.
  recordVisit:()=>(context.env.CF_NATIVE_QA_PROGRESS_MODE as string)==='qa'?logD1StudentDashboardVisit(settings.db,token,result.access.ownedSlugs,settings):Promise.resolve({recorded:false}),
 };
}
