import type { User } from "@supabase/supabase-js";
import { getAdminEmails, type AdminRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminMember = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  source: "env" | "app_metadata";
  canEdit: boolean;
  createdAt: string;
  lastSignInAt: string;
};

export type AdminMembersResult = {
  members: AdminMember[];
  storage: "supabase" | "env" | "missing_service_role";
  message: string | null;
};

const ADMIN_MEMBERS_CACHE_TTL_MS = 30_000;

let adminMembersCache: { expiresAt: number; value: AdminMembersResult } | null = null;

function cacheAdminMembers(value: AdminMembersResult) {
  adminMembersCache = {
    expiresAt: Date.now() + ADMIN_MEMBERS_CACHE_TTL_MS,
    value,
  };

  return value;
}

export function clearAdminMembersCache() {
  adminMembersCache = null;
}

function getFallbackMembers(): AdminMember[] {
  return getAdminEmails().map((email) => ({
    id: `env:${email}`,
    email,
    name: email,
    role: "owner",
    source: "env",
    canEdit: false,
    createdAt: "",
    lastSignInAt: "",
  }));
}

function getUserName(user: User) {
  const metadata = user.user_metadata ?? {};
  return String(metadata.full_name || metadata.name || user.email || "");
}

function getUserRole(user: User, envOwners: Set<string>): AdminRole | null {
  const email = user.email?.toLowerCase() ?? "";

  if (envOwners.has(email)) {
    return "owner";
  }

  if (user.app_metadata?.admin_role === "owner" || user.app_metadata?.admin_role === "editor") {
    return user.app_metadata.admin_role;
  }

  return null;
}

export async function listAdminMembers({ forceRefresh = false }: { forceRefresh?: boolean } = {}): Promise<AdminMembersResult> {
  if (!forceRefresh && adminMembersCache && adminMembersCache.expiresAt > Date.now()) {
    return adminMembersCache.value;
  }

  const fallbackMembers = getFallbackMembers();

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return cacheAdminMembers({
      members: fallbackMembers,
      storage: "missing_service_role",
      message: "Thiếu SUPABASE_SERVICE_ROLE_KEY nên chỉ hiển thị owner cấu hình bằng env.",
    });
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return cacheAdminMembers({
      members: fallbackMembers,
      storage: "env",
      message: "Chưa cấu hình Supabase nên chỉ hiển thị owner cấu hình bằng env.",
    });
  }

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    return cacheAdminMembers({
      members: fallbackMembers,
      storage: "env",
      message: error.message,
    });
  }

  const envOwners = new Set(getAdminEmails());
  const members = data.users
    .map((user) => {
      const email = user.email?.toLowerCase() ?? "";
      const role = getUserRole(user, envOwners);

      if (!email || !role) {
        return null;
      }

      const source = envOwners.has(email) ? "env" : "app_metadata";

      return {
        id: user.id,
        email,
        name: getUserName(user),
        role,
        source,
        canEdit: source === "app_metadata",
        createdAt: user.created_at ?? "",
        lastSignInAt: user.last_sign_in_at ?? "",
      } satisfies AdminMember;
    })
    .filter((member): member is AdminMember => Boolean(member))
    .sort((a, b) => a.role.localeCompare(b.role) || a.email.localeCompare(b.email));

  return cacheAdminMembers({
    members: members.length > 0 ? members : fallbackMembers,
    storage: "supabase",
    message: null,
  });
}

export async function updateAdminMemberRole({
  userId,
  role,
}: {
  userId: string;
  role: AdminRole | "remove";
}) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY nên chưa thể sửa quyền admin.");
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Chưa cấu hình Supabase để sửa quyền admin.");
  }

  const { data: userData, error: getError } = await supabase.auth.admin.getUserById(userId);

  if (getError || !userData.user) {
    throw new Error(getError?.message ?? "Không tìm thấy thành viên admin.");
  }

  const email = userData.user.email?.toLowerCase() ?? "";

  if (getAdminEmails().includes(email)) {
    throw new Error("Owner cấu hình bằng ADMIN_EMAILS không thể hạ quyền trong UI.");
  }

  const appMetadata = { ...(userData.user.app_metadata ?? {}) } as Record<string, unknown>;

  if (role === "remove") {
    delete appMetadata.admin_role;
  } else {
    appMetadata.admin_role = role;
  }

  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: appMetadata,
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Không cập nhật được quyền admin.");
  }

  clearAdminMembersCache();

  return data.user;
}
