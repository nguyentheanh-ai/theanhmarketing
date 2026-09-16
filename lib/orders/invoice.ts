import { cleanEmail, cleanText, isValidEmail } from "@/lib/security/validation";

export type InvoiceDetails = {
  requested: boolean;
  taxCode: string;
  companyName: string;
  companyAddress: string;
  email: string;
};

export const emptyInvoiceDetails: InvoiceDetails = {
  requested: false,
  taxCode: "",
  companyName: "",
  companyAddress: "",
  email: "",
};

export function invoiceInputFromFormData(formData: Pick<FormData, "get">) {
  return {
    requested: formData.get("invoiceRequested") === "on",
    taxCode: formData.get("invoiceTaxCode"),
    companyName: formData.get("invoiceCompanyName"),
    companyAddress: formData.get("invoiceCompanyAddress"),
    email: formData.get("invoiceEmail"),
  };
}

export function normalizeInvoiceInput(input: unknown):
  | { ok: true; value: InvoiceDetails }
  | { ok: false; message: string } {
  if (!input || typeof input !== "object" || !(input as { requested?: unknown }).requested) {
    return { ok: true, value: emptyInvoiceDetails };
  }

  const source = input as Record<string, unknown>;
  const taxCode = cleanText(source.taxCode, 200);
  const companyName = cleanText(source.companyName, 200);
  const companyAddress = cleanText(source.companyAddress, 500);
  const email = cleanEmail(source.email);

  if (!taxCode) {
    return { ok: false, message: "Vui lòng nhập mã số thuế." };
  }

  if (!companyName) {
    return { ok: false, message: "Vui lòng nhập tên doanh nghiệp." };
  }

  if (!companyAddress) {
    return { ok: false, message: "Vui lòng nhập địa chỉ doanh nghiệp." };
  }

  if (!email || !isValidEmail(email)) {
    return { ok: false, message: "Email nhận hóa đơn chưa hợp lệ." };
  }

  return {
    ok: true,
    value: { requested: true, taxCode, companyName, companyAddress, email },
  };
}
