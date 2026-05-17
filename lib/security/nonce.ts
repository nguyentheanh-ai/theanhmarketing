import { headers } from "next/headers";

export async function getCspNonce() {
  const headerStore = await headers();
  return headerStore.get("x-csp-nonce") ?? undefined;
}
