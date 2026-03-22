"use client";

import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard, HardHat, Ruler, ScrollText,
  Users, BarChart3, Settings, ShieldCheck, CommandIcon,
  Building2, MessageSquareWarning, ChevronRight,
} from "lucide-react";

export function Sidebar() {
  const t = useTranslations("Admin.nav");
  const pathname = usePathname();

  const tenderSubPaths = [
    "/admin/tenders/registry",
    "/admin/tenders/bids",
    "/admin/tenders/awards",
    "/admin/tenders/evaluation",
  ];

  const navItems = [
    { label: t("dashboard"),          href: "/admin",                    icon: LayoutDashboard      },
    { label: t("projects"),           href: "/admin/projects",           icon: HardHat              },
    { label: t("design_supervision"), href: "/admin/design-supervision", icon: Ruler                },
    { label: t("tenders"),            href: "/admin/tenders",            icon: ScrollText           },
    { label: t("committee"),          href: "/admin/tenders/approval",   icon: CommandIcon          },
    { label: t("contractors"),        href: "/admin/contractors",        icon: Building2            },
    { label: t("service_requests"),   href: "/admin/service-requests",   icon: MessageSquareWarning },
    { label: t("team"),               href: "/admin/team",               icon: Users                },
    { label: t("reports"),            href: "/admin/reports",            icon: BarChart3            },
    { label: t("audit_logs"),         href: "/admin/audit",              icon: ShieldCheck          },
    { label: t("settings"),           href: "/admin/settings",           icon: Settings             },
  ];

  function isItemActive(href: string): boolean {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/tenders") {
      // Active on exact /admin/tenders OR known tenders sub-pages, but NOT approval
      return pathname === "/admin/tenders" || tenderSubPaths.some(p => pathname.startsWith(p));
    }
    // All other items: exact match or any sub-path
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="w-80 bg-[#0A1628] h-screen text-white flex flex-col border-r border-white/[0.06] shrink-0">

      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3 bg-[#071220]">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
          <img src="/assets/logo.jpg" alt="Lemi Kura" className="w-10 h-10 object-cover" />
        </div>
        <div className="min-w-0">
          <p className="text-amber-500 font-black text-[13px] uppercase tracking-tight leading-none truncate">Lemi Kura</p>
          <p className="text-amber-500/70 text-[10px] font-bold tracking-wider mt-0.5 truncate">Construction Office</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
        {navItems.map((item) => {
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

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E85D1A]/20 flex items-center justify-center shrink-0">
            <ShieldCheck size={14} className="text-[#E85D1A]" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-[11px] font-black truncate">Admin Panel</p>
            <p className="text-white/25 text-[10px] font-medium truncate">v1.0 · Lemi Kura</p>
          </div>
        </div>
      </div>
    </aside>
  );
}