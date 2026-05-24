export function getSupabasePublicKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function hasSupabasePublicEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabasePublicKey());
}

export function assertSupabasePublicEnv() {
  const key = getSupabasePublicKey();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL and public Supabase key.");
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key,
  };
}
