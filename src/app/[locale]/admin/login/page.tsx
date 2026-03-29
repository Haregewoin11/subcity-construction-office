"use client";
// src/app/[locale]/admin/login/page.tsx

import { useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Lock, Mail, AlertTriangle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/actions/supabase/clients";

export default function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const router   = useRouter();
  const supabase = createClient();
  const { locale }  = use(params);
  const searchParams = useSearchParams();

  // Read error from URL query (e.g. expired email confirmation link)
  const urlError = searchParams.get("error_description");
  const urlErrorCode = searchParams.get("error_code");

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(
    urlErrorCode === "otp_expired"
      ? "Your email confirmation link has expired. Please try logging in directly."
      : urlError
      ? decodeURIComponent(urlError.replace(/\+/g, " "))
      : null
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your email and password."); return;
    }
    setLoading(true); setError(null);

    try {
      // 1. Sign in
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email:    email.trim().toLowerCase(),
          password,
        });
      if (authError) throw authError;
      if (!authData.session) throw new Error("No session returned.");

      // 2. Verify profile exists and account is active
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("role, full_name, is_active")
        .eq("id", authData.session.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error("Account profile not found. Contact your administrator.");
      }
      if (!profile.is_active) {
        await supabase.auth.signOut();
        throw new Error("Your account has been deactivated. Contact your administrator.");
      }

      // 3. Navigate to admin dashboard (refresh so server components see the session)
      router.replace(`/${locale}/admin`);
      router.refresh();
    } catch (err: any) {
      setError(
        err?.message === "Invalid login credentials"
          ? "Incorrect email or password. Please try again."
          : err?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#F0F2F5] flex items-center justify-center px-4"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,700;9..40,800&display=swap');`}</style>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

          {/* ── Header ── */}
          <div className="bg-[#1B3A6B] px-8 py-8">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/assets/lemikura-logo.png"
                alt="Lemi Kura"
                width={36} height={36}
                className="shrink-0"
                priority
              />
              <div>
                <h1 className="text-white font-black text-xl uppercase tracking-tight leading-none">
                  Admin Portal
                </h1>
                <p className="text-white/50 text-[11px] mt-0.5">
                  Lemi Kura Sub-City Construction Office
                </p>
              </div>
            </div>
            <div className="h-px bg-white/10" />
            <p className="text-white/40 text-[11px] mt-3 font-medium">
              Sign in to your administrative account
            </p>
          </div>

          {/* ── Form body ── */}
          <form onSubmit={handleLogin} className="px-8 py-8 space-y-5">

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm font-bold">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@lemikura.gov.et"
                  autoComplete="email"
                  className="w-full border border-slate-300 rounded-lg py-3 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B]/20 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full border border-slate-300 rounded-lg py-3 pl-11 pr-11 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#1B3A6B] hover:bg-[#142d54] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-colors mt-2"
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Signing in…</>
                : "Sign In to Portal"
              }
            </button>
          </form>

          {/* ── Footer link to register ── */}
          <div className="border-t border-slate-100 px-8 py-5 text-center">
            <p className="text-slate-400 text-[12px]">
              Don&apos;t have an account?{" "}
              <Link href={`/${locale}/admin/register`}
                className="text-[#E85D1A] font-black hover:underline">
                Register Here
              </Link>
            </p>
          </div>
        </div>

        
      </div>
    </div>
  );
}