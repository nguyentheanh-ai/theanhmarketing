import { redirect } from "next/navigation";
import { requireAdminAuth } from "@/lib/auth/session";
import { getCrmV2LeadProfile } from "@/lib/crm-v2/data";
import { customerIdentity } from "@/services/adminCustomerService";
export const metadata = { title: "Hồ sơ khách hàng" };
export default async function LegacyCustomerProfile({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 await requireAdminAuth(`/admin/crm-v2/leads/${encodeURIComponent(id)}`, ["owner"]);
 if (id.startsWith("email:") || id.startsWith("phone:")) redirect(`/admin/crm-v2/customers?${new URLSearchParams({ q: id.slice(id.indexOf(":") + 1), profile: id })}`);
 const profile = await getCrmV2LeadProfile(id);
 const contact = profile.contact;
 const q = contact?.email || contact?.phone || contact?.fullName || "";
 const key = customerIdentity(contact?.email, contact?.phone, contact?.id || id);
 redirect(`/admin/crm-v2/customers?${new URLSearchParams({ q, profile: key })}`);
}
