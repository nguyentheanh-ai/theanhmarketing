import { StudentPresence } from "@/components/app/student-presence";
import { StudentHelpLauncher } from "@/components/app/student-help-launcher";
import type { Metadata } from "next";
import { requireStudentAuth } from "@/lib/auth/session";
import {nativeDashboardProvider,readNativeDashboardAuth} from "@/lib/cloudflare/native-dashboard-page";
import {redirect} from "next/navigation";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if(nativeDashboardProvider()==="native-d1"){
    const auth=await readNativeDashboardAuth();
    if(auth==="guest")redirect("/dang-nhap?next=%2Fdashboard");
    if(auth==="password-change-required")redirect("/doi-mat-khau?next=%2Fdashboard");
  }else await requireStudentAuth("/dashboard");

  return <>{children}<StudentPresence /><StudentHelpLauncher /></>;
}

// Keep student data round trips in the database region (Supabase ap-southeast-2).
export const preferredRegion = "syd1";
