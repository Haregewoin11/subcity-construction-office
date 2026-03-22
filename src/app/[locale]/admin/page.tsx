import { AdminShell } from "./AdminShell";
import { DashboardCharts } from "../../../components/admin/DashboardCharts";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/actions/supabase/server";
import Link from "next/link";
import {
  HardHat, Banknote, Users, FileText, AlertTriangle,
  ClipboardList, Activity, Building2, ChevronRight,
  ArrowRight, Hammer, BookOpen, HeartPulse, Zap,
  CheckCircle2, TrendingUp
} from "lucide-react";

/* ── helpers ── */
function fmt(n: number) {
  if (!n) return "0";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K";
  return n.toLocaleString();
}
function daysLeft(d: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

const SECTOR_ICON: Record<string, string> = {
  Schools: "📚", Health: "🏥", Youth: "⚡", Libraries: "📖",
};
const SECTOR_COLOR: Record<string, { bg: string; text: string; bar: string; hex: string }> = {
  Schools:   { bg: "bg-blue-100",   text: "text-blue-700",   bar: "bg-blue-500",   hex: "#3B82F6" },
  Health:    { bg: "bg-rose-100",   text: "text-rose-700",   bar: "bg-rose-500",   hex: "#F43F5E" },
  Youth:     { bg: "bg-violet-100", text: "text-violet-700", bar: "bg-violet-500", hex: "#8B5CF6" },
  Libraries: { bg: "bg-amber-100",  text: "text-amber-700",  bar: "bg-amber-500",  hex: "#F59E0B" },
};
const STATUS_COLOR: Record<string, string> = {
  "Ongoing":          "bg-emerald-100 text-emerald-700",
  "Design Phase":     "bg-blue-100    text-blue-700",
  "BOQ Verification": "bg-amber-100   text-amber-700",
  "Completed":        "bg-slate-100   text-slate-600",
  "Tender Phase":     "bg-violet-100  text-violet-700",
};

/* ── server component ── */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");

  const supabase = await createClient();

  /* ── parallel data fetch ── */
  const [
    { data: projects },
    { data: contractors },
    { data: tenders },
    { data: issues },
    { data: inspections },
    { data: reports },
    { data: ipcs },
    { data: auditLogs },
  ] = await Promise.all([
    supabase.from("projects").select("id,name,sector,status,progress,budget,expected_end_date,contractor_id"),
    supabase.from("contractors").select("id,company_name,is_verified"),
    supabase.from("tenders").select("id,status"),
    supabase.from("project_issues").select("id,status,severity"),
    supabase.from("site_inspections").select("id,passed"),
    supabase.from("daily_reports")
      .select("id,project_id,report_date,supervisor_name,cumulative_progress_pct,issue_severity")
      .order("report_date", { ascending: false }).limit(5),
    supabase.from("payment_certificates")
      .select("id,certificate_number,status,gross_amount,net_amount,claim_date,project_id")
      .in("status", ["Submitted","Certified","Approved"])
      .order("claim_date", { ascending: true }).limit(5),
    supabase.from("audit_logs")
      .select("id,action,entity_type,created_at")
      .order("created_at", { ascending: false }).limit(5),
  ]);

  /* ── derived stats ── */
  const projs   = projects    || [];
  const ctcs    = contractors || [];
  const ongoing = projs.filter((p) => p.status === "Ongoing");

  const statusMap: Record<string, number> = {};
  projs.forEach((p) => { statusMap[p.status] = (statusMap[p.status] || 0) + 1; });

  const totalBudget   = projs.reduce((s, p) => s + Number(p.budget || 0), 0);
  const activeBudget  = ongoing.reduce((s, p) => s + Number(p.budget || 0), 0);
  const avgProgress   = ongoing.length
    ? ongoing.reduce((s, p) => s + Number(p.progress || 0), 0) / ongoing.length : 0;
  const openIssues    = (issues || []).filter((i) => i.status === "Open").length;
  const criticalIssues = (issues || []).filter(
    (i) => i.status === "Open" && ["High","Critical"].includes(i.severity)
  ).length;
  const failedInspections = (inspections || []).filter((i) => i.passed === false).length;
  const pendingPaymentAmt = (ipcs || []).reduce((s, i) => s + Number(i.gross_amount || 0), 0);

  /* ── sector breakdown for charts ── */
  const sm: Record<string, { count: number; budget: number }> = {};
  projs.forEach((p) => {
    const k = p.sector || "Other";
    if (!sm[k]) sm[k] = { count: 0, budget: 0 };
    sm[k].count++;
    sm[k].budget += Number(p.budget || 0);
  });
  const sectorStats = Object.entries(sm)
    .filter(([k]) => k !== "Other")
    .map(([sector, v]) => ({ sector, count: v.count, budget: v.budget }))
    .sort((a, b) => b.count - a.count);

  const statusStats = Object.entries(statusMap)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  /* ── chart data for DashboardCharts ── */
  const progressData = ongoing.map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
    progress: Number(p.progress || 0),
  }));

  const sectorChartData = sectorStats.map((s) => ({
    name: s.sector,
    value: s.count,
    color: SECTOR_COLOR[s.sector]?.hex || "#6B7280",
  }));

  /* ── enrich: contractor names for active projects ── */
  const ctcMap: Record<string, string> = {};
  ctcs.forEach((c) => { ctcMap[c.id] = c.company_name; });

  const activeProjs = ongoing.slice(0, 6).map((p) => ({
    ...p,
    contractor_name: p.contractor_id ? ctcMap[p.contractor_id] || null : null,
  }));

  /* ── enrich: project names for reports ── */
  const projMap: Record<string, string> = {};
  projs.forEach((p) => { projMap[p.id] = p.name; });

  const recentReports = (reports || []).map((r) => ({
    ...r,
    project_name: r.project_id ? projMap[r.project_id] || "—" : "—",
  }));

  /* ── enrich: project names for IPCs ── */
  const pendingIPCs = (ipcs || []).map((i) => ({
    ...i,
    project_name: i.project_id ? projMap[i.project_id] || "—" : "—",
  }));

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  /* ─────────────────────────────────────────────────────── */
  return (
    // <AdminShell>
      <div className="min-h-screen bg-[#F4F5F7]">

        {/* ══ DARK HERO HEADER ══ */}
        <div className="bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 40px)"
          }} />
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-orange-600 via-orange-400 to-transparent" />

          <div className="relative max-w-7xl mx-auto px-6 py-8">
            <div className="mb-8">
              <p className="text-[9px] font-black uppercase tracking-[0.5em] text-orange-400 mb-2">
                Lemmikna Sub-City Construction Office
              </p>
              <h1 className="text-3xl font-black uppercase tracking-tight">
                {t("welcome_admin")}
              </h1>
              <p className="text-slate-400 text-xs mt-1.5 font-bold">
                Lemi Kura Sub-City · {today}
              </p>
            </div>

            {/* ── Top KPI strip ── */}
            {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: t("total_projects"),
                  val: projs.length,
                  sub: `${ongoing.length} on site · ${statusMap["Completed"] || 0} done`,
                  icon: <HardHat size={18}/>, accent: "text-orange-400",
                },
                {
                  label: "Portfolio Budget",
                  val: `${fmt(totalBudget)} ETB`,
                  sub: `${fmt(activeBudget)} ETB active`,
                  icon: <Banknote size={18}/>, accent: "text-emerald-400",
                },
                {
                  label: t("ongoing"),
                  val: `${avgProgress.toFixed(1)}%`,
                  sub: "average site progress",
                  icon: <Activity size={18}/>, accent: "text-blue-400",
                },
                {
                  label: "Contractors",
                  val: ctcs.length,
                  sub: `${ctcs.filter(c => c.is_verified).length} verified`,
                  icon: <Users size={18}/>, accent: "text-violet-400",
                },
              ].map((k) => (
                <div key={k.label} className="bg-white/6 border border-white/8 rounded-2xl p-5">
                  <div className={`${k.accent} mb-3`}>{k.icon}</div>
                  <p className="text-2xl font-black text-white">{k.val}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/35 mt-0.5">{k.label}</p>
                  <p className="text-[10px] text-white/25 font-bold mt-1">{k.sub}</p>
                </div>
              ))}
            </div>*/}
          </div> 
        </div>

        {/* ══ BODY ══ */}
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

          {/* ── Stat cards row (matching existing pattern) ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <StatCard
              title={t("total_projects")}
              value={String(projs.length)}
              sub={`${statusMap["Design Phase"] || 0} in design`}
              border="border-slate-900"
              textColor="text-slate-900"
            />
            <StatCard
              title={t("ongoing")}
              value={String(ongoing.length)}
              sub={`${fmt(activeBudget)} ETB`}
              border="border-orange-500"
              textColor="text-orange-600"
            />
            <StatCard
              title={t("completed")}
              value={String(statusMap["Completed"] || 0)}
              sub="projects delivered"
              border="border-emerald-500"
              textColor="text-emerald-600"
            />
            <StatCard
              title="Budget Utilized"
              value={totalBudget > 0 ? `${Math.round((activeBudget / totalBudget) * 100)}%` : "—"}
              sub={`${fmt(totalBudget)} ETB total`}
              border="border-blue-500"
              textColor="text-blue-600"
            />
          </div>

          {/* ── Charts (DashboardCharts component — unchanged API) ── */}
          <DashboardCharts progressData={progressData} sectorData={sectorChartData} />

          {/* ── Pipeline + Sector breakdown ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Project pipeline */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Project Pipeline</p>
                <Link href="/admin/projects"
                  className="text-[9px] font-black text-orange-500 hover:text-orange-700 flex items-center gap-0.5">
                  All <ChevronRight size={10}/>
                </Link>
              </div>
              <div className="space-y-3.5">
                {statusStats.map((s) => {
                  const pct = projs.length > 0 ? (s.count / projs.length) * 100 : 0;
                  return (
                    <div key={s.status}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full ${STATUS_COLOR[s.status] || "bg-slate-100 text-slate-500"}`}>
                          {s.status}
                        </span>
                        <span className="text-sm font-black text-slate-700">{s.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-700 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sector breakdown */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5">By Sector</p>
              <div className="space-y-3.5">
                {sectorStats.map((s) => {
                  const pct  = projs.length > 0 ? (s.count / projs.length) * 100 : 0;
                  const meta = SECTOR_COLOR[s.sector] || { bg:"bg-slate-100", text:"text-slate-600", bar:"bg-slate-400" };
                  return (
                    <div key={s.sector}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={`flex items-center gap-1.5 text-[9px] font-black px-2.5 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>
                          {SECTOR_ICON[s.sector] || "🏗"} {s.sector}
                        </span>
                        <span className="text-sm font-black text-slate-700">{s.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">{fmt(s.budget)} ETB</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        
          {/* ── Recent Activity + Service Requests (preserved from original) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Recent Activity — now from real reports + audit logs */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4 uppercase text-sm tracking-wider border-b border-slate-100 pb-3">
                Recent Activity
              </h3>
              <div className="space-y-3">
                {recentReports.length > 0 ? recentReports.map((r, i) => (
                  <div key={r.id || i} className="flex justify-between items-center text-sm border-b border-slate-50 pb-3 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-700 font-medium truncate">
                        Site report — {r.project_name}
                      </p>
                      <p className="text-[10px] text-slate-400">{r.supervisor_name || "Supervisor"}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase shrink-0 ml-3 ${
                      r.issue_severity === "Critical" || r.issue_severity === "High"
                        ? "bg-orange-100 text-orange-700"
                        : r.cumulative_progress_pct >= 75
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {r.report_date ? new Date(r.report_date).toLocaleDateString("en-GB", { day:"numeric", month:"short" }) : "—"}
                    </span>
                  </div>
                )) : (
                  <p className="text-slate-300 text-sm font-bold text-center py-6">No recent activity</p>
                )}
              </div>
            </div>

            {/* Pending Payments — real IPC data */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4 uppercase text-sm tracking-wider border-b border-slate-100 pb-3">
                Pending Payment Certificates
              </h3>
              {pendingIPCs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <CheckCircle2 size={28} className="text-emerald-300" />
                  <p className="text-slate-300 font-bold text-sm">All payments up to date</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingIPCs.map((ipc, i) => (
                    <Link key={ipc.id || i}
                      href={`/admin/construction-tracking/${ipc.project_id}/payments`}
                      className="flex justify-between items-center text-sm border-b border-slate-50 pb-3 last:border-0 hover:opacity-70 transition-opacity">
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-700 font-medium truncate">{ipc.project_name}</p>
                        <p className="text-[10px] text-slate-400">{ipc.certificate_number}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs font-black text-orange-600">{fmt(Number(ipc.gross_amount))} ETB</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          ipc.status === "Submitted"  ? "bg-blue-100 text-blue-700"
                          : ipc.status === "Certified" ? "bg-violet-100 text-violet-700"
                          : "bg-amber-100 text-amber-700"
                        }`}>{ipc.status}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              <div className="pt-3 border-t border-slate-100 mt-2">
                <Link href="/admin/contractors"
                  className="text-[9px] font-black text-orange-500 hover:text-orange-700 flex items-center gap-1">
                  Manage all payments <ArrowRight size={9}/>
                </Link>
              </div>
            </div>
          </div>

          {/* ── Quick Access ── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Quick Access</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Construction Monitoring", href: "/admin/construction-tracking", icon: <HardHat size={20}/>,   bg: "bg-slate-900"   },
                { label: "Tenders & Bids",          href: "/admin/tenders",               icon: <FileText size={20}/>,  bg: "bg-orange-600"  },
                { label: "Contractor Registry",     href: "/admin/contractors",            icon: <Building2 size={20}/>, bg: "bg-emerald-600" },
                { label: "Design & Supervision",    href: "/admin/design-supervision",     icon: <Hammer size={20}/>,    bg: "bg-blue-600"    },
              ].map((n) => (
                <Link key={n.href} href={n.href}
                  className={`flex items-center gap-3 px-5 py-4 rounded-2xl ${n.bg} hover:opacity-90 transition-all group shadow-sm`}>
                  <div className="text-white opacity-70 group-hover:opacity-100 transition-opacity shrink-0">{n.icon}</div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-white leading-tight">{n.label}</p>
                  <ChevronRight size={12} className="text-white opacity-20 group-hover:opacity-60 ml-auto shrink-0" />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
     
  );
}

/* ── StatCard: matches original component API ── */
function StatCard({
  title, value, sub, border, textColor,
}: {
  title: string; value: string; sub?: string; border: string; textColor: string;
}) {
  return (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border-t-4 ${border} hover:-translate-y-1 transition-all`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <p className={`text-3xl font-black mt-1 ${textColor}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400 font-bold mt-1">{sub}</p>}
    </div>
  );
}