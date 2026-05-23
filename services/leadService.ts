import { fallbackLeads } from "@/data/platform";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type LeadInput = {
  name: string;
  phone?: string;
  email?: string;
  message?: string;
  source?: string;
};

export type LeadItem = {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  need: string;
  source: string;
  status: string;
  createdAt?: string;
};

type DbLead = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  source: string | null;
  created_at: string | null;
};

export async function createLead(input: LeadInput) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return { ok: false, fallback: true, error: "Supabase env is missing" };
  }

  const { error } = await supabase.from("leads").insert({
    name: input.name,
    phone: input.phone ?? "",
    email: input.email ?? "",
    message: input.message ?? "",
    source: input.source ?? "Website",
  });

  if (error) {
    return { ok: false, fallback: true, error: error.message };
  }

  return { ok: true, fallback: false, error: null };
}

export async function createLeadAdmin(input: LeadInput) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, fallback: true, error: "Supabase env is missing" };
  }

  const { error } = await supabase.from("leads").insert({
    name: input.name,
    phone: input.phone ?? "",
    email: input.email ?? "",
    message: input.message ?? "",
    source: input.source ?? "Website",
  });

  if (error) {
    return { ok: false, fallback: true, error: error.message };
  }

  return { ok: true, fallback: false, error: null };
}

export async function getLeads(options: { includeFallback?: boolean } = {}): Promise<LeadItem[]> {
  const includeFallback = options.includeFallback ?? false;
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return includeFallback ? fallbackLeads : [];
  }

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    if (!includeFallback) {
      return [];
    }

    return fallbackLeads;
  }

  return (data as DbLead[]).map((lead) => ({
    id: lead.id,
    name: lead.name,
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    need: lead.message ?? "",
    source: lead.source ?? "Website",
    status: "Mới",
    createdAt: lead.created_at ?? "",
  }));
}
