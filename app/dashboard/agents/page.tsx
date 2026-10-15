import {readNativeUiAuthContext} from '@/lib/cloudflare/native-ui-auth-context';
import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentLibrary } from "@/components/agent-library/agent-library";
import { AGENT_LIBRARY_HREF, requireAgentLibraryAccess } from "@/lib/agent-library-access";
import { StudentAreaShell } from "@/components/app/student-area-shell";
export const dynamic = "force-dynamic";
export const metadata = {title: "Nhân viên AI | The Anh Academy", robots: {index: false, follow: false}};
export default async function AgentLibraryPage() {
  const access = await requireAgentLibraryAccess();
  const authContext=access.authProvider==='native-d1'?await readNativeUiAuthContext():undefined;
  if (!access.ok) {
    if (access.status === 401) redirect(`/dang-nhap?next=${encodeURIComponent(AGENT_LIBRARY_HREF)}`);
    return <StudentAreaShell title="Nhân viên AI" active="agents" authProvider={access.authProvider} authContext={authContext}><section className="mx-auto max-w-xl py-10"><h1 className="text-2xl font-bold">Nhân viên AI</h1><p className="my-5">Tài khoản của bạn chưa có quyền truy cập bộ Agent của khóa học này.</p><Link href="/dashboard">Về khóa học của tôi</Link></section></StudentAreaShell>;
  }
  return <StudentAreaShell title="Nhân viên AI" active="agents" authProvider={access.authProvider} authContext={authContext}><AgentLibrary /></StudentAreaShell>;
}
