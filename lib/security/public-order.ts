import type { PaymentOrder } from "@/services/orderService";

export function toPublicPaymentOrder(order: PaymentOrder): PaymentOrder {
  return {
    ...order,
    email: "",
    phone: "",
    studentName: "",
    sepayReferenceCode: null,
  };
}
