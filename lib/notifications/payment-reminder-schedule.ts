// Vietnam has a fixed UTC+07 offset. Send only during the morning queue drain.
export function isPaymentReminderMorning(now = new Date()) {
  const minutes = ((now.getUTCHours() + 7) % 24) * 60 + now.getUTCMinutes();
  return minutes >= 8 * 60 + 30 && minutes < 9 * 60;
}

export function isUnpaidReminderOrder(order: { status: string; paymentStatus?: string | null }) {
  return (order.status === "pending" || order.status === "expired") && order.paymentStatus !== "paid";
}
