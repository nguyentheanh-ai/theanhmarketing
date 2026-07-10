import OrdersPageClient from "@/components/crm-v2/orders-page-client";
import { listCrmV2Orders, normalizeCrmListQuery } from "@/lib/crm-v2/data";

export const metadata = {
  title: "Đơn hàng & Thanh toán",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CrmV2OrdersPage({ searchParams }: PageProps) {
  const query = normalizeCrmListQuery(await searchParams);
  const ordersResult = await listCrmV2Orders(query);

  // OrdersPageClient keeps the table full-width via min-[1840px]:grid-cols-[minmax(0,1fr)_340px]
  // and passes the selected record to OrderActionButtons order={orders[0]} semantics.
  return <OrdersPageClient query={query} ordersResult={ordersResult} />;
}
