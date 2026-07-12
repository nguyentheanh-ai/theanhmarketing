import { redirect } from "next/navigation";

export const metadata = {
  title: "Đơn hàng & Thanh toán",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CrmV2OrdersPage({ searchParams }: PageProps) {
  await searchParams;
  redirect("/admin/crm-v2/leads");
}
