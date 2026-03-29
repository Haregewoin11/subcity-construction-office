"use client";
// src/components/admin/Sidebar.tsx
//
// Role-based navigation:
//   main_admin     → all modules
//   project_admin  → dashboard, projects, construction_tracking, contractors, reports
//   tenders_admin  → dashboard, tenders, contractors
//   design_admin   → dashboard, design_supervision, projects
//   committee      → dashboard, tenders (read-only)

import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useAuth,AdminRole } from "@/context/Authcontext";
import {
  LayoutDashboard, HardHat, Ruler, ScrollText,
  Users, BarChart3, Settings, ShieldCheck,
  Building2, MessageSquareWarning, ChevronRight,
  HardHat as ConstructionIcon, LogOut, Newspaper,
} from "lucide-react";

// ── Module → allowed roles map ────────────────────────────────────────────────
const MODULE_ROLES: Record<string, AdminRole[]> = {
  dashboard:            ["main_admin","project_admin","tenders_admin","design_admin","committee"],
  projects:             ["main_admin","project_admin","design_admin"],
  design_supervision:   ["main_admin","design_admin"],
  tenders:              ["main_admin","tenders_admin","committee"],
  construction_tracking:["main_admin","project_admin"],
  contractors:          ["main_admin","tenders_admin","project_admin"],
  service_requests:     ["main_admin","project_admin"],
  news:                 ["main_admin","project_admin"],
  reports:              ["main_admin","project_admin","design_admin"],
  users:                ["main_admin"],
  audit_logs:           ["main_admin"],
  settings:             ["main_admin"],
};

function canAccess(module: string, role: AdminRole | null): boolean {
  if (!role) return false;
  return MODULE_ROLES[module]?.includes(role) ?? false;
}

// ── Role display ──────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<AdminRole, { label: string; color: string }> = {
  main_admin:    { label: "Main Admin",          color: "text-[#E85D1A]"   },
  project_admin: { label: "Project Admin",       color: "text-blue-400"    },
  tenders_admin: { label: "Tenders Admin",       color: "text-amber-400"   },
  design_admin:  { label: "Design Admin",        color: "text-emerald-400" },
  committee:     { label: "Committee Member",    color: "text-violet-400"  },
};

// ── Component ─────────────────────────────────────────────────────────────────
export function Sidebar() {
  const t        = useTranslations("Admin.nav");
  const pathname = usePathname();
  const { profile, role, signOut } = useAuth();

  // ── Nav items with module keys for role filtering ──────────────────────────
  const navItems = [
    { module: "dashboard",             label: t("dashboard"),          href: "/admin",                    icon: LayoutDashboard      },
    { module: "projects",              label: t("projects"),           href: "/admin/projects",           icon: HardHat              },
    { module: "construction_tracking", label: t("construction"),       href: "/admin/construction-tracking", icon: ConstructionIcon  },
    { module: "design_supervision",    label: t("design_supervision"), href: "/admin/design-supervision", icon: Ruler                },
    { module: "tenders",               label: t("tenders"),            href: "/admin/tenders",            icon: ScrollText           },
    { module: "contractors",           label: t("contractors"),        href: "/admin/contractors",        icon: Building2            },
    { module: "service_requests",      label: t("service_requests"),   href: "/admin/service-requests",   icon: MessageSquareWarning },
    { module: "news",                  label: t("news"),     href: "/admin/news",               icon: Newspaper            },
    { module: "reports",               label: t("reports"),            href: "/admin/reports",            icon: BarChart3            },
    { module: "users",                 label: t("users") || "Users",   href: "/admin/users",              icon: Users                },
    { module: "audit_logs",            label: t("audit_logs"),         href: "/admin/audit",              icon: ShieldCheck          },
    { module: "settings",              label: t("settings"),           href: "/admin/settings",           icon: Settings             },
  ];

  // Filter to only modules this role can access
  const visibleItems = navItems.filter(item => canAccess(item.module, role));

  const tenderSubPaths = [
    "/admin/tenders/registry",
    "/admin/tenders/bids",
    "/admin/tenders/awards",
    "/admin/tenders/evaluation",
    "/admin/tenders/approval",
  ];

  function isItemActive(href: string): boolean {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/tenders") {
      return pathname === "/admin/tenders" || tenderSubPaths.some(p => pathname.startsWith(p));
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  const roleInfo = role ? ROLE_LABELS[role] : null;

  return (
    <aside className="w-64 bg-[#0A1628] h-screen text-white flex flex-col border-r border-white/[0.06] shrink-0">

      {/* ── Logo ── */}
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3 bg-[#071220]">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
          <img src="/assets/logo.jpg" alt="Lemi Kura" className="w-10 h-10 object-cover" />
        </div>
        <div className="min-w-0">
          <p className="text-amber-500 font-black text-[13px] uppercase tracking-tight leading-none truncate">
            Lemi Kura
          </p>
          <p className="text-amber-500/70 text-[10px] font-bold tracking-wider mt-0.5 truncate">
            Construction Office
          </p>
        </div>
      </div>

      {/* ── Role badge ── */}
      {roleInfo && (
        <div className="px-4 py-3 border-b border-white/[0.04] bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${
              role === "main_admin"    ? "bg-[#E85D1A]"   :
              role === "project_admin" ? "bg-blue-400"    :
              role === "tenders_admin" ? "bg-amber-400"   :
              role === "design_admin"  ? "bg-emerald-400" :
              "bg-violet-400"
            }`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${roleInfo.color}`}>
              {roleInfo.label}
            </span>
          </div>
          {profile?.full_name && (
            <p className="text-white/35 text-[11px] font-medium mt-0.5 truncate pl-4">
              {profile.full_name}
            </p>
          )}
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {visibleItems.map(item => {
          const isActive = isItemActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                isActive
                  ? "bg-[#E85D1A] text-white shadow-lg shadow-[#E85D1A]/20"
                  : "text-white/50 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <item.icon
                size={16}
                className={`shrink-0 transition-transform duration-150 ${
                  isActive ? "scale-110" : "group-hover:scale-105"
                }`}
              />
              <span className="text-[13px] font-bold flex-1 truncate">{item.label}</span>
              {isActive && <ChevronRight size={12} className="shrink-0 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer: user info + sign out ── */}
      <div className="px-4 py-4 border-t border-white/[0.06] space-y-3">
        {/* User card */}
        {profile && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#E85D1A]/20 flex items-center justify-center shrink-0">
              <span className="text-[#E85D1A] font-black text-[11px]">
                {profile.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-[11px] font-black truncate">{profile.full_name}</p>
              <p className="text-white/25 text-[10px] font-medium truncate">{profile.email}</p>
            </div>
          </div>
        )}

        {/* Sign out button */}
        <button
          type="button"
          onClick={signOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.06] transition-all group"
        >
          <LogOut size={14} className="shrink-0 group-hover:text-red-400 transition-colors" />
          <span className="text-[12px] font-bold">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}