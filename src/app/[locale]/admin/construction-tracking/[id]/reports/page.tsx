"use client";
// src/app/[locale]/admin/construction-tracking/[id]/reports/page.tsx

import React, { useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { History, PlusCircle, BarChart3, ArrowLeft, MapPin, TrendingUp } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/actions/supabase/clients";
import DailyReportForm  from "@/components/admin/report/DailyReport";
import ReportHistory    from "@/components/admin/report/ReportHist";
import ReportAnalytics  from "@/components/admin/report/ReportAnalytics";

type Tab = "history" | "new" | "analysis";
const VALID_TABS: Tab[] = ["history", "new", "analysis"];

// ── Tabs config OUTSIDE component — stable references, no JSX icons ──────────
// Icons are rendered inline so they don't need to be in this array
const TAB_CONFIG: { key: Tab; labelKey: string }[] = [
  { key: "history",  labelKey: "tab_history"  },
  { key: "new",      labelKey: "tab_new"       },
  { key: "analysis", labelKey: "tab_analysis"  },
];
const TAB_ICON: Record<Tab, React.ReactNode> = {
  history:  <History size={13} />,
  new:      <PlusCircle size={13} />,
  analysis: <BarChart3 size={13} />,
};

export default function ReportsHub({ params }: { params: { id: string } }) {
  const projectId = params.id;

  const t          = useTranslations("Admin.reports_hub");
  const locale     = useLocale();
  const router     = useRouter();
  const pathname   = usePathname();
  const searchParams = useSearchParams();
  const supabase   = useRef(createClient()).current;

  const [project, setProject] = React.useState<any>(null);

  // ── Active tab is stored in URL ?tab= so locale navigation preserves it ───
  const rawTab   = searchParams.get("tab") ?? "history";
  const activeTab: Tab = VALID_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "history";

  const setActiveTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (!projectId) return;
    supabase
      .from("projects")
      .select("id, name, sector, status, progress, location, expected_end_date")
      .eq("id", projectId)
      .single()
      .then(({ data }) => setProject(data));
  }, [projectId]);

  return (
    <div className="min-h-screen bg-[#F4F5F7]">

      {/* Top strip */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">

          {/* Back + project name */}
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href={`/${locale}/admin/construction-tracking`}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors shrink-0"
            >
              <ArrowLeft size={14} /> {t("back_label")}
            </Link>
            <span className="text-slate-200 text-lg">/</span>
            {project ? (
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">
                  {project.name}
                </p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {project.sector && (
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                      {project.sector}
                    </span>
                  )}
                  {project.location && (
                    <span className="flex items-center gap-1 text-[9px] text-slate-400 font-bold">
                      <MapPin size={9} /> {project.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[9px] text-orange-600 font-black">
                    <TrendingUp size={9} /> {project.progress ?? 0}{t("complete_pct")}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
            )}
          </div>

          {/* Tab switcher — tab.key is the stable identifier, no re-creation issues */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
            {TAB_CONFIG.map(tab => (
              <button
                key={tab.key}
                type="button"                        
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.key
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                {TAB_ICON[tab.key]} {t(tab.labelKey)}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === "history"  && <ReportHistory  projectId={projectId} />}
        {activeTab === "new"      && (
          <DailyReportForm
            projectId={projectId}
            onSuccess={() => setActiveTab("history")}
          />
        )}
        {activeTab === "analysis" && <ReportAnalytics projectId={projectId} />}
      </div>
    </div>
  );
}