"use client";

import { createBrowserClient } from "@supabase/ssr";

import { assertSupabasePublicEnv, hasSupabasePublicEnv } from "./env";

export function hasSupabaseBrowserEnv() {
  return hasSupabasePublicEnv();
}

export function createBrowserSupabaseClient() {
  const { key, url } = assertSupabasePublicEnv();

  return createBrowserClient(url, key);
}
