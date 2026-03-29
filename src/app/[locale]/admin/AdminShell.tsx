"use client";
// src/components/admin/AdminShell.tsx
//
// Client-side shell that:
// 1. Reads auth state from AuthContext
// 2. Redirects unauthenticated users to /admin/login
// 3. Shows sidebar + topnav for authenticated users
// 4. Bypasses the shell for /login and /register routes (they render full-page)

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/Authcontext";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { Loader2 } from "lucide-react";

const PUBLIC_ADMIN_ROUTES = ["/login", "/register"];

export function AdminShell({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const { session, loading } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  // Check if this is a public admin route (login / register)
  const isPublicRoute = PUBLIC_ADMIN_ROUTES.some(r => pathname.endsWith(r));

  useEffect(() => {
    if (loading) return;
    // Not authenticated and not on a public route → redirect to login
    if (!session && !isPublicRoute) {
      router.replace(`/${locale}/admin/login`);
    }
  }, [session, loading, isPublicRoute, locale, router]);

  // Public routes (login, register) render standalone — no shell
  if (isPublicRoute) return <>{children}</>;

  // Loading state
  if (loading) return (
    <div className="min-h-screen bg-[#071220] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={28} className="text-[#E85D1A] animate-spin" />
        <p className="text-white/30 text-[11px] font-black uppercase tracking-widest">
          Loading…
        </p>
      </div>
    </div>
  );

  // Not authenticated — redirect in effect, show nothing
  if (!session) return null;

  // Authenticated — render full admin shell
  return (
    <div className="flex h-screen bg-[#F4F5F7] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        <footer className="bg-[#071220] border-t border-white/[0.06] text-white/40 py-2 px-8 text-[10px] flex justify-between shrink-0">
          <span>Lemi Kura Sub-City © 2026 · Digital Forensics Audit Enabled</span>
          <span>Working Hours: Mon–Fri 8:30 AM – 5:30 PM</span>
        </footer>
      </div>
    </div>
  );
}