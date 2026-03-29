"use client";
// src/app/[locale]/admin/tenders/page.tsx

import { useAuth } from "@/context/Authcontext";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3, CheckCircle2,
  ClipboardCheck, FileSignature,
  Gavel, Inbox,
  Terminal
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function TenderManagementHub() {
  const t      = useTranslations("Admin.tenders_module");
  const locale = useLocale();
  const { supabase } = useAuth();
  const [stats, setStats] = useState({ total: 0, open: 0, evaluating: 0, awarded: 0, pendingApproval: 0, totalBudget: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from("tenders").select("status, budget_estimate");
      if (!error && data) {
        setStats({
          total:           data.length,
          open:            data.filter(r => r.status === "Open").length,
          evaluating:      data.filter(r => ["Under Evaluation", "Closed"].includes(r.status)).length,
          awarded:         data.filter(r => r.status === "Awarded").length,
          pendingApproval: data.filter(r => r.status === "Pending Approval").length,
          totalBudget:     data.reduce((acc, r) => acc + (Number(r.budget_estimate) || 0), 0),
        });
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const p = (path: string) => `/${locale}${path}`;

  const modules = [
    { id: "registry", title: t("mod_registry"),  desc: t("mod_registry_desc"),  icon: Gavel,         color: "#0A1628", link: p("/admin/tenders/registry"),   badge: null },
    { id: "approval", title: t("mod_committee"), desc: t("mod_committee_desc"), icon: ClipboardCheck, color: "#E85D1A", link: p("/admin/tenders/approval"),   badge: stats.pendingApproval > 0 ? stats.pendingApproval : null },
    { id: "bids",     title: t("mod_bids"),      desc: t("mod_bids_desc"),      icon: Inbox,          color: "#F4A261", link: p("/admin/tenders/bids"),       badge: null },
    { id: "eval",     title: t("mod_eval"),      desc: t("mod_eval_desc"),      icon: BarChart3,      color: "#8E44AD", link: p("/admin/tenders/evaluation"), badge: null },
    { id: "awards",   title: t("mod_awards"),    desc: t("mod_awards_desc"),    icon: FileSignature,  color: "#1A5276", link: p("/admin/tenders/awards"),     badge: null },
    { id: "reports",  title: t("mod_reports"),   desc: t("mod_reports_desc"),   icon: CheckCircle2,   color: "#16A085", link: p("/admin/tenders/reports"),    badge: null },
  ];

  const workflow = [
    { step: "01", label: "Planned Project",   color: "#6C757D" },
    { step: "02", label: "Draft Tender",      color: "#0A1628" },
    { step: "03", label: "Committee Review",  color: "#E85D1A" },
    { step: "04", label: "Published (Open)",  color: "#039737" },
    { step: "05", label: "Bid Submissions",   color: "#2980B9" },
    { step: "06", label: "Evaluation",        color: "#8E44AD" },
    { step: "07", label: "Award",             color: "#F4A261" },
    { step: "08", label: "Contract Signed",   color: "#039737" },
  ];

  return (
    <div className="min-h-screen p-8 flex flex-col bg-soft-bg">

      {/* HEADER */}
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-text-primary">{t("hub_title")}</h1>
          <p className="text-sm font-bold text-text-secondary">{t("hub_subtitle")}</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("total_budget_label")}</p>
          <p className="text-xl font-black text-[#0A1628]">
            {loading ? t("loading_budget") : `${(stats.totalBudget / 1_000_000).toFixed(1)}M ETB`}
          </p>
        </div>
      </header>

      {/* STATS */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {[
          { label: t("stat_total"),            val: stats.total,           color: "#0A1628" },
          { label: t("stat_pending_approval"), val: stats.pendingApproval, color: "#E85D1A" },
          { label: t("stat_open"),             val: stats.open,            color: "#039737" },
          { label: t("stat_evaluating"),       val: stats.evaluating,      color: "#8E44AD" },
          { label: t("stat_awarded"),          val: stats.awarded,         color: "#1A5276" },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-4xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-[#0A1628] transition-all">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{s.label}</p>
              <p className="text-3xl font-black" style={{ color: s.color }}>{loading ? ".." : s.val}</p>
            </div>
            <div className="p-3 rounded-2xl opacity-10 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: s.color }}>
              <Activity size={20} className="text-white" />
            </div>
          </div>
        ))}
      </section>

      {/* WORKFLOW TIMELINE */}
      <section className="bg-white rounded-4xl border border-slate-200 shadow-sm p-6 mb-10">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5">{t("workflow_title")}</h2>
        <div className="flex flex-wrap gap-2">
          {workflow.map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <span className="text-[9px] font-black text-slate-400">{w.step}</span>
                <p className="text-[10px] font-black" style={{ color: w.color }}>{w.label}</p>
              </div>
              {i < workflow.length - 1 && <ArrowUpRight size={12} className="text-slate-300 rotate-45" />}
            </div>
          ))}
        </div>
      </section>

      {/* MODULES GRID */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {modules.map((m) => (
          <Link href={m.link} key={m.id} className="group relative">
            {m.badge && (
              <span className="absolute -top-2 -right-2 z-10 bg-red-500 text-white text-[10px] font-black rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                {m.badge}
              </span>
            )}
            <div className="h-full bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all group-hover:shadow-2xl group-hover:-translate-y-2 flex flex-col">
              <div className="p-4 w-fit rounded-2xl text-white shadow-lg mb-6 transition-transform group-hover:scale-110" style={{ backgroundColor: m.color }}>
                <m.icon size={22} />
              </div>
              <h3 className="text-md font-black uppercase text-text-primary">{m.title}</h3>
              <p className="text-[11px] font-bold text-text-secondary mt-2 mb-8 leading-relaxed">{m.desc}</p>
              <div className="mt-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#0A1628]">
                {t("enter_module")} <ArrowUpRight size={14} />
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* FOOTER */}
      <footer className="mt-auto bg-[#0A1628] rounded-[2.5rem] p-2 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-2 text-[#039737]">
            <Terminal size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">System_Log:</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-10 text-[10px] font-mono text-blue-200 opacity-70">
              <span>[SYNC] Connected to Supabase Node...</span>
              <span>[AUTH] Admin Session Verified...</span>
              <span>[FLOW] 8-Stage Procurement Workflow Active...</span>
            </div>
          </div>
          {stats.pendingApproval > 0 && (
            <div className="flex items-center gap-4 border-l border-white/10 pl-6">
              <AlertTriangle size={16} className="text-[#E85D1A]" />
              <span className="text-[10px] font-black uppercase text-white">
                {stats.pendingApproval > 1
                  ? t("awaiting_approval_plural", { n: stats.pendingApproval })
                  : t("awaiting_approval", { n: stats.pendingApproval })}
              </span>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}