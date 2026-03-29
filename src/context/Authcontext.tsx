"use client";
// src/context/AuthContext.tsx
//
// SINGLETON PATTERN — one Supabase client for the entire admin app.
//
// WHY: Supabase JS uses the Web Locks API to serialize auth token refreshes.
// The lock name is derived from the project URL — it's GLOBAL per browser tab.
// If multiple SupabaseClient instances exist simultaneously (e.g. one in
// AuthContext + one per page via useRef(createClient())), they all compete
// for the same lock → NavigatorLockAcquireTimeoutError → infinite loading.
//
// FIX: Create ONE client at module level (outside React, created once on import).
// Expose it via useAuth() so every component reuses the same instance.
// Login/Register use the same module-level browser client from @/lib/actions/supabase/clients
// (singleton) so there is only one auth storage + refresh pipeline per tab.

import { createContext, useContext, useEffect, useRef } from "react";
import { useState } from "react";
import { createClient } from "@/lib/actions/supabase/clients";
import type { SupabaseClient, User, Session } from "@supabase/supabase-js";

// ── Module-level singleton — ONE instance for the entire app lifecycle ─────────
// Never recreated — not inside a component, not in useRef, not in useMemo.
const supabaseInstance: SupabaseClient = createClient();

// ── Types ─────────────────────────────────────────────────────────────────────
export type AdminRole =
  | "main_admin"
  | "project_admin"
  | "tenders_admin"
  | "design_admin"
  | "committee";

export interface UserProfile {
  id:          string;
  email:       string;
  full_name:   string;
  role:        AdminRole;
  department?: string | null;
  phone?:      string | null;
  avatar_url?: string | null;
  is_active:   boolean;
}

interface AuthState {
  supabase:    SupabaseClient;   // ← expose so pages reuse the same instance
  session:     Session | null;
  user:        User | null;
  profile:     UserProfile | null;
  role:        AdminRole | null;
  loading:     boolean;
  signOut:     () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthState>({
  supabase:    supabaseInstance,
  session:     null,
  user:        null,
  profile:     null,
  role:        null,
  loading:     true,
  signOut:     async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// ── Role permission helper ────────────────────────────────────────────────────
export function can(role: AdminRole | null, action: string): boolean {
  if (!role) return false;
  const perms: Record<string, AdminRole[]> = {
    view_projects:      ["main_admin","project_admin","design_admin","committee"],
    edit_projects:      ["main_admin","project_admin"],
    view_tenders:       ["main_admin","tenders_admin","committee"],
    edit_tenders:       ["main_admin","tenders_admin"],
    approve_tenders:    ["main_admin","committee"],
    view_design:        ["main_admin","design_admin","project_admin"],
    edit_design:        ["main_admin","design_admin"],
    view_contractors:   ["main_admin","tenders_admin","project_admin"],
    edit_contractors:   ["main_admin","tenders_admin"],
    manage_users:       ["main_admin"],
    view_reports:       ["main_admin","project_admin","design_admin"],
    view_payments:      ["main_admin","project_admin"],
    approve_payments:   ["main_admin"],
    view_service_reqs:  ["main_admin","project_admin"],
  };
  return perms[action]?.includes(role) ?? role === "main_admin";
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Use the module-level singleton — never create a new one here
  const supabase = supabaseInstance;

  const [session, setSession]   = useState<Session | null>(null);
  const [user,    setUser]      = useState<User | null>(null);
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [loading, setLoading]   = useState(true);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) setProfile(data as UserProfile);
  }

  useEffect(() => {
    let mounted = true;

    // Get initial session — called once on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty deps — supabase is a stable module-level reference

  const signOut = async () => {
    await supabase.auth.signOut({ scope: "global" });
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      supabase,
      session,
      user,
      profile,
      role:    profile?.role ?? null,
      loading,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}