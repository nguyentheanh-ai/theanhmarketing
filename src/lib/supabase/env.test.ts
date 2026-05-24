import { afterEach, describe, expect, it } from "vitest";

import { getSupabasePublicKey, hasSupabasePublicEnv } from "./env";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Supabase public env compatibility", () => {
  it("uses the modern publishable key when present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-anon";

    expect(getSupabasePublicKey()).toBe("sb_publishable_test");
    expect(hasSupabasePublicEnv()).toBe(true);
  });

  it("falls back to the existing website anon key without changing env names", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-anon";

    expect(getSupabasePublicKey()).toBe("legacy-anon");
    expect(hasSupabasePublicEnv()).toBe(true);
  });
});
