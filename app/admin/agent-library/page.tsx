import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { AgentPackageUpload } from "@/components/agent-library/package-upload";
export const dynamic="force-dynamic";
export default async function Page(){const {user,adminRole}=await getCurrentAuth();if(!user)redirect("/dang-nhap?next=%2Fadmin%2Fagent-library");if(adminRole!=="owner")return <main className="p-10">Bạn không có quyền quản lý gói Agent.</main>;return <AgentPackageUpload/>;}
