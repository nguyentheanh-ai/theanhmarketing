export type VietQrBankApp = {
  appId: string;
  appName: string;
};

type LoadBankAppsOptions = {
  userAgent: string;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
};

type BuildBankAppUrlInput = {
  appId: string;
  bankCode: string;
  bankAccountNumber: string;
  bankAccountName: string;
  amount: number;
  transferContent: string;
  returnUrl: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getDirectoryUrl(userAgent: string) {
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return "https://api.vietqr.io/v2/ios-app-deeplinks";
  }
  if (/Android/i.test(userAgent)) {
    return "https://api.vietqr.io/v2/android-app-deeplinks";
  }
  return "";
}

export async function loadVietQrBankApps({
  userAgent,
  fetchImpl = fetch,
}: LoadBankAppsOptions): Promise<VietQrBankApp[]> {
  const directoryUrl = getDirectoryUrl(userAgent);
  if (!directoryUrl) return [];

  try {
    const response = await fetchImpl(directoryUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return [];
    const body = asRecord(await response.json());
    if (!Array.isArray(body.apps)) return [];

    const seen = new Set<string>();
    return body.apps
      .map((value) => {
        const row = asRecord(value);
        return {
          appId: typeof row.appId === "string" ? row.appId.trim().toLowerCase() : "",
          appName: typeof row.appName === "string" ? row.appName.trim() : "",
          monthlyInstall: Number(row.monthlyInstall ?? 0),
        };
      })
      .filter((app) => {
        if (!/^[a-z0-9._-]{1,40}$/.test(app.appId) || !app.appName) return false;
        if (seen.has(app.appId)) return false;
        seen.add(app.appId);
        return true;
      })
      .sort((left, right) => right.monthlyInstall - left.monthlyInstall)
      .slice(0, 16)
      .map(({ appId, appName }) => ({ appId, appName }));
  } catch {
    return [];
  }
}

export function buildVietQrBankAppUrl(input: BuildBankAppUrlInput) {
  const appId = input.appId.trim().toLowerCase();
  const bankCode = input.bankCode.trim().toLowerCase();
  const accountNumber = input.bankAccountNumber.trim();
  const accountName = input.bankAccountName.trim();
  const transferContent = input.transferContent.trim();
  let returnUrl: URL;

  try {
    returnUrl = new URL(input.returnUrl);
  } catch {
    throw new Error("invalid_bank_handoff");
  }

  if (
    !/^[a-z0-9._-]{1,40}$/.test(appId) ||
    !/^[a-z0-9]{2,12}$/.test(bankCode) ||
    !/^[A-Za-z0-9]{4,40}$/.test(accountNumber) ||
    !accountName ||
    !transferContent ||
    transferContent.length > 50 ||
    !Number.isFinite(input.amount) ||
    input.amount <= 0 ||
    returnUrl.protocol !== "https:" ||
    returnUrl.hostname !== "www.theanhmarketing.com" ||
    !/^\/thanh-toan\/TAM[A-Z0-9]+$/.test(returnUrl.pathname)
  ) {
    throw new Error("invalid_bank_handoff");
  }

  const params = new URLSearchParams({
    app: appId,
    ba: `${accountNumber}@${bankCode}`,
    am: String(Math.round(input.amount)),
    tn: transferContent,
    bn: accountName,
    url: returnUrl.toString(),
  });
  return `https://dl.vietqr.io/pay?${params.toString()}`;
}
