import { redirect } from "next/navigation";

export default function LegacyAgentLibraryPage() {
  redirect("/dashboard/agents");
}
