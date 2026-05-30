"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminMember, AdminMembersResult } from "@/lib/admin/admin-members";
import type { AdminRole } from "@/lib/auth/session";

type MembersResponse = {
  ok: boolean;
  data?: AdminMembersResult;
  message?: string;
};

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function roleBadgeClass(role: AdminRole) {
  return role === "owner" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-sky-50 text-sky-700 border-sky-200";
}

export function AdminMembersClient() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AdminRole | "all">("all");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState("");

  const loadMembers = useCallback(async ({ forceRefresh = false, signal }: { forceRefresh?: boolean; signal?: AbortSignal } = {}) => {
    setLoading(true);
    const endpoint = forceRefresh ? "/api/admin/members?force_refresh=1" : "/api/admin/members";

    try {
      const response = await fetch(endpoint, { cache: "no-store", signal });
      const payload = (await response.json().catch(() => null)) as MembersResponse | null;

      if (!response.ok || !payload?.ok || !payload.data) {
        setNotice(payload?.message ?? "Không tải được danh sách thành viên admin.");
        return;
      }

      setMembers(payload.data.members);
      setNotice(payload.data.message ?? "");
      setLastLoadedAt(new Date().toISOString());
    } catch (error) {
      if (!signal?.aborted) {
        setNotice(error instanceof Error ? error.message : "Không tải được danh sách thành viên admin.");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadMembers({ signal: controller.signal });
    }, 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [loadMembers]);

  const filteredMembers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return members.filter((member) => {
      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      const matchesSearch =
        !keyword ||
        [member.name, member.email, member.role, member.source].some((value) => value.toLowerCase().includes(keyword));

      return matchesRole && matchesSearch;
    });
  }, [members, roleFilter, search]);

  function optimisticUpdateRole(member: AdminMember, role: AdminRole | "remove") {
    setMembers((currentMembers) => {
      if (role === "remove") {
        return currentMembers.filter((item) => item.id !== member.id);
      }

      return currentMembers.map((item) => (item.id === member.id ? { ...item, role } : item));
    });
  }

  async function updateRole(member: AdminMember, role: AdminRole | "remove") {
    const previousMembers = members;
    setSavingUserId(member.id);
    setNotice("");
    optimisticUpdateRole(member, role);

    const response = await fetch("/api/admin/members", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: member.id,
        role,
      }),
    });
    const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

    if (!response.ok || !payload?.ok) {
      setMembers(previousMembers);
      setNotice(payload?.message ?? "Không cập nhật được quyền admin.");
    }

    setSavingUserId("");
  }

  return (
    <div className="mx-auto max-w-[1300px]">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Phân quyền</p>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">
            Quản lý thành viên admin
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Owner quản lý người có quyền vào khu vận hành. Owner từ biến môi trường luôn được giữ an toàn và không hạ quyền trong UI.
          </p>
        </div>
        <button
          className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          type="button"
          disabled={loading}
          onClick={() => void loadMembers({ forceRefresh: true })}
        >
          {loading ? "Đang tải" : "Làm mới"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[1fr_auto_auto] md:items-center">
        <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
          <span aria-hidden="true">⌕</span>
          <input
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
            placeholder="Tìm email hoặc tên"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as AdminRole | "all")}
        >
          <option value="all">Tất cả quyền</option>
          <option value="owner">owner</option>
          <option value="editor">editor</option>
        </select>
        <p className="text-xs font-semibold text-slate-500">
          {filteredMembers.length}/{members.length} thành viên
          {lastLoadedAt ? ` · cập nhật ${formatDate(lastLoadedAt)}` : ""}
        </p>
      </div>

      {notice ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {notice}
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.1em] text-slate-500">
            <tr>
              <th className="border-b border-slate-200 px-4 py-3">Thành viên</th>
              <th className="border-b border-slate-200 px-4 py-3">Vai trò</th>
              <th className="border-b border-slate-200 px-4 py-3">Nguồn quyền</th>
              <th className="border-b border-slate-200 px-4 py-3">Lần vào gần nhất</th>
              <th className="border-b border-slate-200 px-4 py-3">Ngày tạo</th>
              <th className="border-b border-slate-200 px-4 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <tr key={member.id} className="border-t border-slate-100 align-middle">
                  <td className="px-4 py-4">
                    <p className="font-black text-slate-950">{member.name || member.email}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{member.email}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black uppercase ${roleBadgeClass(member.role)}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-600">
                    {member.source === "env" ? "ADMIN_EMAILS" : "app_metadata.admin_role"}
                  </td>
                  <td className="px-4 py-4 text-slate-500">{formatDate(member.lastSignInAt)}</td>
                  <td className="px-4 py-4 text-slate-500">{formatDate(member.createdAt)}</td>
                  <td className="px-4 py-4 text-right">
                    {member.canEdit ? (
                      <div className="flex justify-end gap-2">
                        <select
                          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm font-bold text-slate-800"
                          value={member.role}
                          disabled={savingUserId === member.id}
                          onChange={(event) => void updateRole(member, event.target.value as AdminRole)}
                        >
                          <option value="owner">owner</option>
                          <option value="editor">editor</option>
                        </select>
                        <button
                          className="h-9 rounded-md border border-rose-200 bg-rose-50 px-3 text-sm font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                          type="button"
                          disabled={savingUserId === member.id}
                          onClick={() => void updateRole(member, "remove")}
                        >
                          {savingUserId === member.id ? "Đang lưu" : "Gỡ quyền"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">Khóa bằng env</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-10 text-center text-sm font-semibold text-slate-500" colSpan={6}>
                  {loading ? "Đang tải thành viên..." : "Không có thành viên phù hợp."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
