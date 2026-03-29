"use client";
// src/app/[locale]/admin/users/page.tsx

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth, AdminRole } from "@/context/Authcontext";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  UserPlus, Search, RefreshCw, Shield, MoreVertical,
  Edit2, UserX, UserCheck, Eye, EyeOff, X,
  Loader2, AlertTriangle, CheckCircle2, Lock, ChevronDown,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdminUser {
  id:              string;
  email:           string;
  full_name:       string;
  role:            AdminRole;
  department:      string | null;
  phone:           string | null;
  is_active:       boolean;
  last_seen:       string | null;
  created_at:      string;
  email_confirmed: boolean;
  last_sign_in_at: string | null;
}

// ── Role style config ─────────────────────────────────────────────────────────
const ROLE_STYLES: Record<AdminRole, { color: string; bg: string; dot: string; border: string }> = {
  main_admin:    { color: "text-orange-600",  bg: "bg-orange-50",   dot: "bg-orange-500",  border: "border-orange-200" },
  project_admin: { color: "text-blue-600",    bg: "bg-blue-50",     dot: "bg-blue-500",    border: "border-blue-200"   },
  tenders_admin: { color: "text-amber-600",   bg: "bg-amber-50",    dot: "bg-amber-500",   border: "border-amber-200"  },
  design_admin:  { color: "text-emerald-600", bg: "bg-emerald-50",  dot: "bg-emerald-500", border: "border-emerald-200"},
  committee:     { color: "text-violet-600",  bg: "bg-violet-50",   dot: "bg-violet-500",  border: "border-violet-200" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso: string | null, neverLabel: string, justNowLabel: string): string {
  if (!iso) return neverLabel;
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return justNowLabel;
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function UserModal({
  mode, user, onClose, onSuccess, supabase, t,
}: {
  mode: "add" | "edit";
  user?: AdminUser;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  supabase: SupabaseClient;
  t: ReturnType<typeof useTranslations>;
}) {
  const ROLE_OPTIONS: { value: AdminRole; labelKey: string }[] = [
    { value: "main_admin",    labelKey: "role_main_admin"    },
    { value: "project_admin", labelKey: "role_project_admin" },
    { value: "tenders_admin", labelKey: "role_tenders_admin" },
    { value: "design_admin",  labelKey: "role_design_admin"  },
    { value: "committee",     labelKey: "role_committee"     },
  ];

  const [form, setForm] = useState({
    full_name:  user?.full_name  ?? "",
    email:      user?.email      ?? "",
    phone:      user?.phone      ?? "",
    department: user?.department ?? "",
    role:       (user?.role ?? "project_admin") as AdminRole,
    password:   "",
    confirm:    "",
    is_active:  user?.is_active  ?? true,
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showCnf, setShowCnf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(v => ({ ...v, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.full_name.trim()) return setError(t("err_name_required"));
    if (mode === "add") {
      if (!form.email.trim())  return setError(t("err_email_required"));
      if (!form.password)      return setError(t("err_pwd_required"));
      if (form.password.length < 8) return setError(t("err_pwd_length"));
      if (form.password !== form.confirm) return setError(t("err_pwd_match"));
    }
    setLoading(true);
    try {
      if (mode === "add") {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email:    form.email.trim().toLowerCase(),
          password: form.password,
          options:  { data: { full_name: form.full_name.trim() } },
        });
        if (authErr) throw authErr;
        if (!authData.user) throw new Error(t("err_generic"));
        const { data: res, error: profileErr } = await supabase.rpc("create_user_profile", {
          p_id:        authData.user.id,
          p_email:     form.email.trim().toLowerCase(),
          p_full_name: form.full_name.trim(),
          p_role:      form.role,
          p_phone:     form.phone.trim() || null,
        });
        if (profileErr) throw profileErr;
        if (res?.error) throw new Error(res.message ?? t("err_email_exists"));
        await supabase.rpc("confirm_admin_email", { p_user_id: authData.user.id });
        onSuccess(t("toast_created"));
      } else {
        const { data: res, error: updateErr } = await supabase.rpc("update_user_profile", {
          p_id:         user!.id,
          p_full_name:  form.full_name.trim(),
          p_role:       form.role,
          p_department: form.department.trim() || null,
          p_phone:      form.phone.trim()      || null,
          p_is_active:  form.is_active,
        });
        if (updateErr) throw updateErr;
        if (res?.error) throw new Error(res.message ?? t("err_generic"));
        onSuccess(t("toast_updated"));
      }
      onClose();
    } catch (err: any) {
      setError(
        err?.message?.includes("already registered") || err?.message?.includes("already exists")
          ? t("err_email_exists")
          : err?.message || t("err_generic")
      );
    } finally {
      setLoading(false);
    }
  };

  const rs = ROLE_STYLES[form.role];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(7,18,32,0.85)", backdropFilter: "blur(6px)" }}>
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">

        {/* Header — dark navy */}
        <div className="flex items-center justify-between px-7 py-5 bg-[#1B3A6B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
              {mode === "add" ? <UserPlus size={15} className="text-white" /> : <Edit2 size={14} className="text-white" />}
            </div>
            <div>
              <p className="text-white font-black text-sm">{mode === "add" ? t("modal_add_title") : t("modal_edit_title")}</p>
              {mode === "edit" && <p className="text-white/50 text-[10px] mt-0.5">{user?.email}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-7 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle size={13} className="text-red-500 shrink-0" />
              <p className="text-red-600 text-sm font-bold">{error}</p>
            </div>
          )}

          {/* Role selector */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
              {t("modal_role_label")}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {ROLE_OPTIONS.map(r => {
                const s = ROLE_STYLES[r.value];
                const active = form.role === r.value;
                return (
                  <label key={r.value}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                      active ? `${s.bg} ${s.border}` : "border-slate-200 hover:border-slate-300"
                    }`}>
                    <input type="radio" name="role" value={r.value}
                      checked={active}
                      onChange={() => setForm(v => ({ ...v, role: r.value }))}
                      className="sr-only" />
                    <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                    <span className={`text-[12px] font-black ${active ? s.color : "text-slate-500"}`}>
                      {t(r.labelKey)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Full name */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              {t("modal_name_label")} <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.full_name} onChange={set("full_name")}
              placeholder={t("modal_name_ph")}
              className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#1B3A6B]/50 focus:ring-1 focus:ring-[#1B3A6B]/20 transition-all" />
          </div>

          {/* Email — add only */}
          {mode === "add" && (
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                {t("modal_email_label")} <span className="text-red-500">*</span>
              </label>
              <input type="email" value={form.email} onChange={set("email")}
                placeholder={t("modal_email_ph")}
                className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#1B3A6B]/50 focus:ring-1 focus:ring-[#1B3A6B]/20 transition-all" />
            </div>
          )}

          {/* Phone + Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                {t("modal_phone_label")}
              </label>
              <input type="tel" value={form.phone} onChange={set("phone")}
                placeholder={t("modal_phone_ph")}
                className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#1B3A6B]/50 transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                {t("modal_dept_label")}
              </label>
              <input type="text" value={form.department} onChange={set("department")}
                placeholder={t("modal_dept_ph")}
                className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#1B3A6B]/50 transition-all" />
            </div>
          </div>

          {/* Password — add only */}
          {mode === "add" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  {t("modal_pwd_label")} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} value={form.password} onChange={set("password")}
                    placeholder={t("modal_pwd_ph")}
                    className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 pr-10 text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#1B3A6B]/50 transition-all" />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPwd ? <EyeOff size={13}/> : <Eye size={13}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  {t("modal_confirm_label")} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input type={showCnf ? "text" : "password"} value={form.confirm} onChange={set("confirm")}
                    placeholder={t("modal_confirm_ph")}
                    className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 pr-10 text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none focus:border-[#1B3A6B]/50 transition-all" />
                  <button type="button" onClick={() => setShowCnf(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showCnf ? <EyeOff size={13}/> : <Eye size={13}/>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active toggle — edit only */}
          {mode === "edit" && (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-slate-800 font-black text-sm">{t("modal_status_label")}</p>
                <p className="text-slate-400 text-[10px] mt-0.5">{t("modal_status_sub")}</p>
              </div>
              <button type="button"
                onClick={() => setForm(v => ({ ...v, is_active: !v.is_active }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? "bg-emerald-500" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#1B3A6B] hover:bg-[#142d54] disabled:opacity-50 text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-colors">
            {loading
              ? <><Loader2 size={13} className="animate-spin" /> {mode === "add" ? t("modal_creating") : t("modal_saving")}</>
              : mode === "add"
                ? <><UserPlus size={13} /> {t("modal_create_btn")}</>
                : <><CheckCircle2 size={13} /> {t("modal_save_btn")}</>
            }
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { supabase, profile, role } = useAuth();
  const router = useRouter();
  const t = useTranslations("Admin.users_module");

  const [users,   setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState<AdminRole | "all">("all");
  const [modal,   setModal]   = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [menu,    setMenu]    = useState<string | null>(null);
  const [toast,   setToast]   = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Guard
  useEffect(() => {
    if (role && role !== "main_admin") router.replace("/admin");
  }, [role, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_all_user_profiles");
    if (!error && Array.isArray(data)) setUsers(data as unknown as AdminUser[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggleActive = async (user: AdminUser) => {
    const { data: res, error } = await supabase.rpc("update_user_profile", {
      p_id: user.id, p_full_name: user.full_name, p_role: user.role,
      p_department: user.department, p_phone: user.phone, p_is_active: !user.is_active,
    });
    if (error || res?.error) showToast(t("toast_status_fail"), "error");
    else {
      showToast(`${user.full_name} ${!user.is_active ? t("toast_activated") : t("toast_deactivated")}`, "success");
      fetchUsers();
    }
    setMenu(null);
  };

  const handleResetPassword = async (user: AdminUser) => {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/admin/login`,
    });
    if (error) showToast(t("toast_reset_fail"), "error");
    else showToast(`${t("toast_reset_sent")} ${user.email}.`, "success");
    setMenu(null);
  };

  const ROLE_OPTIONS: { value: AdminRole; labelKey: string }[] = [
    { value: "main_admin",    labelKey: "role_main_admin"    },
    { value: "project_admin", labelKey: "role_project_admin" },
    { value: "tenders_admin", labelKey: "role_tenders_admin" },
    { value: "design_admin",  labelKey: "role_design_admin"  },
    { value: "committee",     labelKey: "role_committee"     },
  ];

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) ||
            (u.department ?? "").toLowerCase().includes(q)) &&
           (filter === "all" || u.role === filter);
  });

  const stats: Record<string, number> = {
    total:  users.length,
    active: users.filter(u => u.is_active).length,
    ...Object.fromEntries(ROLE_OPTIONS.map(r => [r.value, users.filter(u => u.role === r.value).length])),
  };

  if (role !== "main_admin") return null;

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border font-bold text-sm ${
          toast.type === "success"
            ? "bg-white border-emerald-200 text-emerald-700"
            : "bg-white border-red-200 text-red-600"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16} className="text-emerald-500"/> : <AlertTriangle size={16} className="text-red-500"/>}
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {modal === "add" && (
        <UserModal mode="add" supabase={supabase} t={t}
          onClose={() => setModal(null)}
          onSuccess={msg => { fetchUsers(); showToast(msg, "success"); }} />
      )}
      {modal === "edit" && editing && (
        <UserModal mode="edit" user={editing} supabase={supabase} t={t}
          onClose={() => { setModal(null); setEditing(null); }}
          onSuccess={msg => { fetchUsers(); showToast(msg, "success"); }} />
      )}

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-black text-2xl uppercase tracking-tight">{t("page_title")}</h1>
          <p className="text-white/50 text-[12px] mt-1">{t("page_subtitle")}</p>
        </div>
        <button type="button" onClick={() => setModal("add")}
          className="flex items-center gap-2 bg-[#E85D1A] hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-colors">
          <UserPlus size={14} /> {t("add_user")}
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Total */}
        <div className="bg-[#0D1F38] border border-white/[0.08] rounded-2xl px-4 py-3">
          <p className="text-2xl font-black text-white">{stats.total}</p>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mt-0.5">{t("stat_total")}</p>
        </div>
        {/* Active */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3">
          <p className="text-2xl font-black text-emerald-400">{stats.active}</p>
          <p className="text-emerald-400/70 text-[10px] font-bold uppercase tracking-wider mt-0.5">{t("stat_active")}</p>
        </div>
        {/* Per role */}
        {ROLE_OPTIONS.map(r => {
          const s = ROLE_STYLES[r.value];
          return (
            <div key={r.value} className="bg-[#0D1F38] border border-white/[0.06] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                <p className={`text-xl font-black ${s.color}`}>{stats[r.value] ?? 0}</p>
              </div>
              <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider leading-tight">{t(r.labelKey)}</p>
            </div>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("search_placeholder")}
            className="w-full bg-[#0D1F38] border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#E85D1A]/40 transition-all" />
        </div>
        <div className="relative">
          <select value={filter} onChange={e => setFilter(e.target.value as AdminRole | "all")}
            className="appearance-none bg-[#0D1F38] border border-white/[0.08] rounded-xl py-2.5 pl-4 pr-9 text-white text-sm focus:outline-none focus:border-[#E85D1A]/40 transition-all cursor-pointer">
            <option value="all">{t("filter_all_roles")}</option>
            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{t(r.labelKey)}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        </div>
        <button type="button" onClick={fetchUsers}
          className="flex items-center gap-2 bg-[#0D1F38] hover:bg-white/[0.08] border border-white/[0.08] text-white/60 hover:text-white px-4 py-2.5 rounded-xl text-sm transition-all">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> {t("refresh")}
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-[#0D1F38] border border-white/[0.06] rounded-2xl overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/[0.06] bg-[#071220]">
          {[
            { label: t("col_user"),        span: "col-span-3" },
            { label: t("col_role"),        span: "col-span-2" },
            { label: t("col_department"),  span: "col-span-2" },
            { label: t("col_status"),      span: "col-span-2" },
            { label: t("col_last_active"), span: "col-span-2" },
            { label: "",                   span: "col-span-1" },
          ].map((h, i) => (
            <div key={i} className={`${h.span} text-[9px] font-black text-white/40 uppercase tracking-widest`}>
              {h.label}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-[#E85D1A] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Shield size={32} className="text-white/10 mb-3" />
            <p className="text-white/40 font-bold text-sm">{t("no_users")}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map(user => {
              const s = ROLE_STYLES[user.role];
              const roleKey = `role_${user.role}` as
                    "role_main_admin"|"role_project_admin"|"role_tenders_admin"|
                    "role_design_admin"|"role_committee";
                  const roleLabel = t(roleKey);
              const isSelf = profile?.id === user.id;
              return (
                <div key={user.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors">

                  {/* User */}
                  <div className="col-span-3 flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                      <span className={`font-black text-sm ${s.color}`}>
                        {user.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-white font-black text-[13px] truncate leading-snug">
                          {user.full_name}
                        </p>
                        {isSelf && (
                          <span className="text-[9px] text-[#E85D1A] font-black bg-[#E85D1A]/15 px-1.5 py-0.5 rounded shrink-0">
                            {t("you_badge")}
                          </span>
                        )}
                      </div>
                      <p className="text-white/50 text-[11px] truncate">{user.email}</p>
                      {user.phone && <p className="text-white/30 text-[10px]">{user.phone}</p>}
                    </div>
                  </div>

                  {/* Role */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black ${s.bg} ${s.color} border ${s.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {roleLabel}
                    </span>
                  </div>

                  {/* Department */}
                  <div className="col-span-2">
                    <p className="text-white/50 text-[12px] truncate">{user.department ?? "—"}</p>
                  </div>

                  {/* Status */}
                  <div className="col-span-2 space-y-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black ${
                      user.is_active
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : "bg-white/[0.05] text-white/40 border border-white/[0.06]"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-400" : "bg-white/20"}`} />
                      {user.is_active ? t("status_active") : t("status_inactive")}
                    </span>
                    {!user.email_confirmed && (
                      <p className="text-amber-400 text-[9px] font-bold">{t("email_unconfirmed")}</p>
                    )}
                  </div>

                  {/* Last active */}
                  <div className="col-span-2">
                    <p className="text-white/60 text-[12px] font-medium">
                      {timeAgo(user.last_sign_in_at, t("never"), t("just_now"))}
                    </p>
                    <p className="text-white/25 text-[10px] mt-0.5">
                      {user.created_at
                        ? `${t("joined")} ${new Date(user.created_at).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}`
                        : ""}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex justify-end">
                    <div className="relative">
                      <button type="button"
                        onClick={() => setMenu(menu === user.id ? null : user.id)}
                        className="p-2 text-white/25 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all">
                        <MoreVertical size={15} />
                      </button>

                      {menu === user.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-[#0D1F38] border border-white/[0.12] rounded-xl shadow-2xl z-20 overflow-hidden">
                          <button type="button"
                            onClick={() => { setEditing(user); setModal("edit"); setMenu(null); }}
                            className="w-full flex items-center gap-2.5 px-4 py-3 text-white/70 hover:text-white hover:bg-white/[0.05] text-[12px] font-bold transition-colors">
                            <Edit2 size={13} /> {t("action_edit")}
                          </button>
                          <button type="button"
                            onClick={() => handleResetPassword(user)}
                            className="w-full flex items-center gap-2.5 px-4 py-3 text-white/70 hover:text-white hover:bg-white/[0.05] text-[12px] font-bold transition-colors">
                            <Lock size={13} /> {t("action_reset_pwd")}
                          </button>
                          {!isSelf && (
                            <button type="button"
                              onClick={() => handleToggleActive(user)}
                              className={`w-full flex items-center gap-2.5 px-4 py-3 text-[12px] font-bold transition-colors ${
                                user.is_active
                                  ? "text-red-400/80 hover:text-red-300 hover:bg-red-500/[0.06]"
                                  : "text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/[0.06]"
                              }`}>
                              {user.is_active ? <><UserX size={13} /> {t("action_deactivate")}</> : <><UserCheck size={13} /> {t("action_activate")}</>}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.04] flex items-center justify-between">
          <p className="text-white/40 text-[10px] font-bold">
            {filtered.length} {t("footer_of")} {users.length} {users.length !== 1 ? t("footer_users") : t("footer_user")}
          </p>
          <p className="text-white/25 text-[10px]">
            {stats.active} {t("footer_active")} · {users.length - stats.active} {t("footer_inactive")}
          </p>
        </div>
      </div>

      {/* Click-outside to close menu */}
      {menu && <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />}
    </div>
  );
}