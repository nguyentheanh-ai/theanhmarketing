import { getCurrentAuth } from "@/lib/auth/session";
import { AGENT_KIT_SLUG } from "@/lib/agent-kit-preorder";
import { getCourseAccessSlugs } from "@/lib/course-access";
import { getStudentLmsAccess } from "@/services/lmsService";
import { getPaymentOrders } from "@/services/orderService";
import { getLeads } from "@/services/leadService";

export const AGENT_LIBRARY_HREF = "/dashboard/agents";
export async function requireAgentLibraryAccess(): Promise<{ok: true} | {ok: false; status: 401 | 403}> {
  const {user, adminRole} = await getCurrentAuth();
  // Downloads always require authentication, including local environments.
  if (!user) return {ok: false, status: 401};
  if (adminRole) return {ok: true};
  if (!user.email) return {ok: false, status: 403};
  const lms = await getStudentLmsAccess({email: user.email, userId: user.id, isAdmin: false});
  if (lms.ownedSlugs.includes(AGENT_KIT_SLUG)) return {ok: true};
  const [orders, leads] = await Promise.all([
    getPaymentOrders({includeFallback: false}), getLeads({includeFallback: false}),
  ]);
  const owned = getCourseAccessSlugs({email: user.email, orders, leads});
  return owned.includes(AGENT_KIT_SLUG) ? {ok: true} : {ok: false, status: 403};
}
