"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { LanguageSwitcher } from "../../../components/shared/LanguageSwitcher";
import {
  Bell, Search, UserCircle, MessageSquareWarning,
  ScrollText, X, ChevronRight, CheckCircle2,
} from "lucide-react";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Types ──────────────────────────────────────────────────────────────────
interface NotifItem {
  id: string;
  label: string;
  sub: string;
  href: string;
  icon: React.ReactNode;
  accent: string;
  badge: string;
}

// ── Notification dropdown ──────────────────────────────────────────────────
function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ count: pendingReqs }, { count: overdueTenders }] = await Promise.all([
        supabase
          .from("service_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("tenders")
          .select("*", { count: "exact", head: true })
          .eq("status", "Published")
          .lt("submission_deadline", new Date().toISOString()),
      ]);

      const built: NotifItem[] = [];

      if ((pendingReqs ?? 0) > 0) {
        built.push({
          id: "service_requests",
          label: "Pending Service Requests",
          sub: `${pendingReqs} request${pendingReqs !== 1 ? "s" : ""} waiting for review`,
          href: "/admin/service-requests",
          icon: <MessageSquareWarning size={15} />,
          accent: "text-amber-500",
          badge: String(pendingReqs),
        });
      }

      if ((overdueTenders ?? 0) > 0) {
        built.push({
          id: "tenders",
          label: "Overdue Tenders",
          sub: `${overdueTenders} tender${overdueTenders !== 1 ? "s" : ""} past submission deadline`,
          href: "/admin/tenders",
          icon: <ScrollText size={15} />,
          accent: "text-red-500",
          badge: String(overdueTenders),
        });
      }

      setItems(built);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-[#0D1F38] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
        <p className="text-[11px] font-black uppercase tracking-widest text-white/40">Notifications</p>
        <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Items */}
      <div className="py-2">
        {loading ? (
          <div className="px-5 py-6 text-center text-white/30 text-xs font-bold">Loading...</div>
        ) : items.length === 0 ? (
          <div className="px-5 py-6 flex flex-col items-center gap-2 text-center">
            <CheckCircle2 size={24} className="text-[#039737]" />
            <p className="text-white/60 text-xs font-bold">All caught up — no pending items.</p>
          </div>
        ) : (
          items.map((item) => (
            <Link key={item.id} href={item.href} onClick={onClose}
              className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-white/[0.04] transition-colors group">
              <div className={`mt-0.5 shrink-0 ${item.accent}`}>{item.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[13px] font-bold leading-snug">{item.label}</p>
                <p className="text-white/40 text-xs mt-0.5">{item.sub}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full bg-white/10 ${item.accent}`}>
                  {item.badge}
                </span>
                <ChevronRight size={12} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="border-t border-white/[0.06] px-5 py-3">
          <Link href="/admin/audit" onClick={onClose}
            className="text-[11px] font-black uppercase tracking-wider text-[#E85D1A] hover:text-orange-400 transition-colors">
            View Audit Log →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Main TopNav ────────────────────────────────────────────────────────────
export function TopNav() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [totalNotifs, setTotalNotifs] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fetch total badge count on mount
  useEffect(() => {
    async function loadCount() {
      const [{ count: pendingReqs }, { count: overdueTenders }] = await Promise.all([
        supabase
          .from("service_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("tenders")
          .select("*", { count: "exact", head: true })
          .eq("status", "Published")
          .lt("submission_deadline", new Date().toISOString()),
      ]);
      setTotalNotifs((pendingReqs ?? 0) + (overdueTenders ?? 0));
    }
    loadCount();
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="h-14 bg-[#071220] border-b border-white/[0.06] text-white flex items-center justify-between px-6 shrink-0 z-10">

      {/* Left — search */}
      <div className="flex items-center w-72">
        <div className="relative w-full">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            type="text"
            placeholder="Search projects, tenders..."
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl py-2 pl-9 pr-4 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#E85D1A]/40 focus:bg-white/[0.08] transition-all font-medium"
          />
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1">

        {/* Language switcher */}
        <div className="px-1">
          <LanguageSwitcher />
        </div>

        <div className="w-px h-6 bg-white/10 mx-2" />

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className={`relative p-2.5 rounded-xl transition-all ${
              notifOpen ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <Bell size={17} />
            {totalNotifs > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E85D1A] rounded-full ring-2 ring-[#071220]" />
            )}
          </button>

          {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} />}
        </div>

        <div className="w-px h-6 bg-white/10 mx-2" />

        {/* User */}
        <div className="flex items-center gap-3 pl-1">
          <div className="text-right">
            <p className="text-[12px] font-black text-white leading-none">Admin User</p>
            <p className="text-[10px] text-white/30 font-medium mt-0.5">Chief Engineer</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#E85D1A]/20 border border-[#E85D1A]/30 flex items-center justify-center">
            <UserCircle size={18} className="text-[#E85D1A]" />
          </div>
        </div>
      </div>
    </header>
  );
}