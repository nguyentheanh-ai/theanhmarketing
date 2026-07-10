import { redirect } from "next/navigation";

export default async function AdminPriorityQueueTransitionPage({
  searchParams,
}: {
  searchParams?: Promise<{ task?: string | string[] }>;
}) {
  const query = (await searchParams) ?? {};
  const task = Array.isArray(query.task) ? query.task[0] : query.task;
  redirect(task
    ? `/admin/dashboard?task=${encodeURIComponent(task)}#viec-can-xu-ly`
    : "/admin/dashboard#viec-can-xu-ly");
}
