import {getNativeRequestContext} from '@/lib/cloudflare/native-request-context';
import {resolveNativeStageOptions} from '@/lib/cloudflare/native-stage-router';
import {readD1StudentLesson} from '@/lib/cloudflare/d1-student-session-access';
import {readD1SessionCookie} from '@/lib/cloudflare/d1-auth-http';

function options(){const context=getNativeRequestContext();if(!context)return null;const settings=resolveNativeStageOptions(context.request,context.env);return settings?{context,settings}:null;}
export function nativeLearningProvider(){return options()?'native-d1' as const:'supabase' as const;}
// No Supabase fallback after a QA request enters the native data path. A stale
// snapshot or invalid configuration must surface an error, not mixed authority.
export async function readNativeLearningPage(courseSlug:string,lessonId:string){
 const native=options();if(!native)return null;
 return readD1StudentLesson(native.settings.db,readD1SessionCookie(native.context.request),{courseSlug,lessonId},native.settings);
}
