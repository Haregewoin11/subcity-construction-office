"use client";
// src/app/[locale]/admin/register/page.tsx

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/actions/supabase/clients";
import type { AdminRole } from "@/context/Authcontext";

// ── Role options (matches DB enum + screenshot) ───────────────────────────────
const ROLES: { value: AdminRole; label: string }[] = [
  { value: "main_admin",    label: "Main Admin"                  },
  { value: "project_admin", label: "Project Admin"               },
  { value: "tenders_admin", label: "Tenders Admin"               },
  { value: "design_admin",  label: "Design & Supervision Admin"  },
  { value: "committee",     label: "Committee Member"            },
];

export default function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const router   = useRouter();
  const supabase = createClient();
  const { locale } = use(params);

  const [form, setForm] = useState({
    full_name:        "",
    email:            "",
    phone:            "",
    role:             "project_admin" as AdminRole,
    password:         "",
    confirm_password: "",
  });
  const [showPwd,   setShowPwd]   = useState(false);
  const [showCnf,   setShowCnf]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [success,   setSuccess]   = useState(false);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(v => ({ ...v, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!form.full_name.trim())
      return setError("Full name is required.");
    if (!form.email.trim())
      return setError("Office email is required.");
    if (!form.password)
      return setError("Password is required.");
    if (form.password.length < 8)
      return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirm_password)
      return setError("Passwords do not match.");

    setLoading(true);
    try {
      // 1. Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email:    form.email.trim().toLowerCase(),
        password: form.password,
        options:  {
          data: { full_name: form.full_name.trim() },
          // No emailRedirectTo — we confirm via DB function below
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed.");

      // 2. Create user_profile via SECURITY DEFINER function
      // Function returns { success: true } or { error: "email_exists", message: "..." }
      const { data: profileResult, error: profileError } = await supabase.rpc("create_user_profile", {
        p_id:        authData.user.id,
        p_email:     form.email.trim().toLowerCase(),
        p_full_name: form.full_name.trim(),
        p_role:      form.role,
        p_phone:     form.phone.trim() || null,
      });

      if (profileError) throw profileError;

      // Check the function's own error response
      if (profileResult?.error === "email_exists") {
        // Clean up the auth user we just created to avoid orphans
        await supabase.auth.signOut();
        throw new Error(profileResult.message || "An account with this email already exists.");
      }

      // Confirm email immediately — admin accounts don't need email verification
      await supabase.rpc("confirm_admin_email", { p_user_id: authData.user.id });

      setSuccess(true);
    } catch (err: any) {
      setError(
        err?.message?.includes("already registered") ||
        err?.message?.includes("already exists") ||
        err?.message?.includes("email_exists")
          ? "An account with this email already exists."
          : err?.message || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center px-4"
      style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,700;9..40,800&display=swap');`}</style>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-[#1B3A6B] px-8 py-7 text-center">
            <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
            <h1 className="text-white font-black text-xl uppercase tracking-tight">
              Registration Successful
            </h1>
          </div>
          <div className="px-8 py-8 text-center">
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              Your account has been created. Check your email to confirm
              your address, then sign in.
            </p>
            <Link href={`/${locale}/admin/login`}
              className="inline-block w-full bg-[#1B3A6B] hover:bg-[#142d54] text-white text-center py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl transition-colors">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center px-4 py-10"
      style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,700;9..40,800&display=swap');`}</style>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

          {/* ── Header — dark navy, matches screenshot ── */}
          <div className="bg-[#1B3A6B] px-8 py-8">
            <h1 className="text-white font-black text-2xl uppercase tracking-tight">
              SYSTEM REGISTRY
            </h1>
            <p className="text-white/50 text-[12px] mt-1">
              Official Sub-City Construction Portal
            </p>
          </div>

          {/* ── Form body ── */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm font-bold">{error}</p>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={set("full_name")}
                placeholder="e.g. Abebe Bekele"
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B]/20 transition-all"
              />
            </div>

            {/* Office Email */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Office Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="your@lemikura.gov.et"
                autoComplete="email"
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B]/20 transition-all"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="+251 9XX XXX XXX"
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B]/20 transition-all"
              />
            </div>

            {/* Administrative Role */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Administrative Role
              </label>
              <select
                value={form.role}
                onChange={set("role")}
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B]/20 transition-all bg-white"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 pr-11 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B]/20 transition-all"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showCnf ? "text" : "password"}
                  value={form.confirm_password}
                  onChange={set("confirm_password")}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 pr-11 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B]/20 transition-all"
                />
                <button type="button" onClick={() => setShowCnf(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showCnf ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit — dark navy button, matches screenshot */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#1B3A6B] hover:bg-[#142d54] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-colors mt-2"
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Creating account…</>
                : "Register Account"
              }
            </button>
          </form>

          {/* ── Footer — "Already have access?" ── */}
          <div className="border-t border-slate-100 px-8 py-5 text-center">
            <p className="text-slate-400 text-[12px]">
              Already have access?{" "}
              <Link href={`/${locale}/admin/login`}
                className="text-[#E85D1A] font-black hover:underline">
                Log In Here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}