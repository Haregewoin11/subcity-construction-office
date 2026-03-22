"use client";

import React, { useState, useEffect, use } from "react";
import { History, PlusCircle, BarChart3, ArrowLeft, MapPin, TrendingUp } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/actions/supabase/clients";
import DailyReportForm from "@/components/admin/report/DailyReport";
import ReportHistory   from "@/components/admin/report/ReportHist";
import ReportAnalytics from "@/components/admin/report/ReportAnalytics";

type Tab = "history" | "new" | "analysis";

export default function ReportsHub({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15: params is a Promise — must unwrap with React.use()
  const { id: projectId } = use(params);

  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>("history");
  const [project,   setProject]   = useState<any>(null);

  useEffect(() => {
    if (!projectId) return;
    supabase
      .from("projects")
      .select("id, name, sector, status, progress, location, expected_end_date")
      .eq("id", projectId)
      .single()
      .then(({ data }) => setProject(data));
  }, [projectId]);

  const tabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: "history",  icon: <History size={13} />,    label: "History"    },
    { key: "new",      icon: <PlusCircle size={13} />, label: "New Report" },
    { key: "analysis", icon: <BarChart3 size={13} />,  label: "Analysis"   },
  ];

  return (
    <>
      <div className="min-h-screen bg-[#F4F5F7]">

        {/* ── Top strip ── */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">

            {/* Back + project name */}
            <div className="flex items-center gap-4 min-w-0">
              <Link
                href="/admin/construction-tracking"
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors shrink-0"
              >
                <ArrowLeft size={14} /> Monitoring
              </Link>
              <span className="text-slate-200 text-lg">/</span>
              {project ? (
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">{project.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {project.sector && (
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{project.sector}</span>
                    )}
                    {project.location && (
                      <span className="flex items-center gap-1 text-[9px] text-slate-400 font-bold">
                        <MapPin size={9} /> {project.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[9px] text-orange-600 font-black">
                      <TrendingUp size={9} /> {project.progress ?? 0}% complete
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
              )}
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === t.key
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          {activeTab === "history"  && <ReportHistory  projectId={projectId} />}
          {activeTab === "new"      && <DailyReportForm projectId={projectId} onSuccess={() => setActiveTab("history")} />}
          {activeTab === "analysis" && <ReportAnalytics projectId={projectId} />}
        </div>
      </div>
    </>
  );
}