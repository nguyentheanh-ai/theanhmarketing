export type HeaderAuthProvider = "supabase" | "native-d1";
export type HeaderAuthState = "guest" | "student";

type SourceClient = {
  auth: {
    getSession(): Promise<{ data: { session: unknown } }>;
    onAuthStateChange(callback: (event: string, session: unknown) => void): {
      data: { subscription: { unsubscribe(): void } };
    };
  };
};

// This controls navigation labels only. Backend routes remain the authority for access.
export function observeHeaderAuth(
  provider: HeaderAuthProvider,
  options: {
    createSourceClient(): SourceClient | null;
    fetchSession: typeof fetch;
    onState(state: HeaderAuthState): void;
  },
) {
  let closed = false;
  let revision = 0;
  let pending: AbortController | undefined;
  const emit = (state: HeaderAuthState) => { if (!closed) options.onState(state); };
  emit("guest");

  if (provider === "supabase") {
    const client = options.createSourceClient();
    if (!client) return { refresh() {}, close() { closed = true; } };
    const initialRevision = revision;
    void client.auth.getSession().then(({ data }) => {
      if (revision === initialRevision) emit(data.session ? "student" : "guest");
    }).catch(() => { if (revision === initialRevision) emit("guest"); });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      revision++;
      emit(session ? "student" : "guest");
    });
    return { refresh() {}, close() { closed = true; data.subscription.unsubscribe(); } };
  }

  const refresh = () => {
    if (closed) return;
    const current = ++revision;
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    const timer = setTimeout(() => controller.abort(), 10_000);
    void (async () => {
      let state: HeaderAuthState = "guest";
      try {
        const response = await options.fetchSession("/api/cloudflare-auth/session", {
          credentials: "same-origin", cache: "no-store", redirect: "error", signal: controller.signal,
        });
        if (response.status === 200 && /^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") ?? "")) {
          const result: unknown = await response.json();
          if (result && typeof result === "object" && "ok" in result && result.ok === true && "user" in result) {
            const user = result.user;
            if (user && typeof user === "object" && "id" in user && typeof user.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) state = "student";
          }
        }
      } catch { /* An unavailable native session never falls back to an old Source cookie. */ }
      finally { clearTimeout(timer); }
      if (current === revision) emit(state);
    })();
  };
  refresh();
  return { refresh, close() { closed = true; revision++; pending?.abort(); } };
}
