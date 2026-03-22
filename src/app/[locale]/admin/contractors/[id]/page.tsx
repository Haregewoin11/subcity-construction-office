"use client";
// src/app/[locale]/admin/contractors/[id]/page.tsx

import React, { useEffect, useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  ArrowLeft, Building2, ShieldCheck, ShieldAlert, Mail, Phone,
  Hash, FileText, MapPin, Calendar, Banknote,
  CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp, Inbox,
} from "lucide-react";
import { createClient } from "@/lib/actions/supabase/clients";
import Link from "next/link";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B ETB";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + "M ETB";
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K ETB";
  return n.toLocaleString() + " ETB";
}

const SECTOR_COLOR: Record<string, string> = {
  Education: "bg-blue-100   text-blue-700",
  Schools:   "bg-blue-100   text-blue-700",
  Health:    "bg-rose-100   text-rose-700",
  Youth:     "bg-violet-100 text-violet-700",
  Libraries: "bg-amber-100  text-amber-700",
};

// ── IPC status config — uses t() keys, not hardcoded labels ──────────────────
// Status icons are kept as JSX since they don't need translation
const IPC_STATUS_ICON: Record<string, React.ReactNode> = {
  Submitted: <Clock size={10} />,
  Certified: <FileText size={10} />,
  Approved:  <CheckCircle2 size={10} />,
  Paid:      <Banknote size={10} />,
  Rejected:  <XCircle size={10} />,
};

const IPC_STATUS_CSS: Record<string, string> = {
  Submitted: "bg-blue-100 text-blue-700",
  Certified: "bg-violet-100 text-violet-700",
  Approved:  "bg-amber-100 text-amber-700",
  Paid:      "bg-emerald-100 text-emerald-700",
  Rejected:  "bg-red-100 text-red-700",
};

// IPC status → translation key map
const IPC_STATUS_KEY: Record<string, string> = {
  Submitted: "ipc_status_submitted",
  Certified: "ipc_status_certified",
  Approved:  "ipc_status_approved",
  Paid:      "ipc_status_paid",
  Rejected:  "ipc_status_rejected",
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ContractorDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const t        = useTranslations("Admin.contractors_module");
  const locale   = useLocale();
  const supabase = useRef(createClient()).current;

  const [contractor, setContractor] = useState<any>(null);
  const [projects,   setProjects]   = useState<any[]>([]);
  const [ipcs,       setIpcs]       = useState<any[]>([]);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);

      const { data: c } = await supabase
        .from("contractors")
        .select("*")
        .eq("id", id)
        .single();

      setContractor(c);

      const [{ data: projs }] = await Promise.all([
        supabase.from("projects")
          .select("id, name, sector, status, progress, expected_end_date")
          .eq("contractor_id", id),
      ]);

      setProjects(projs || []);

      // Payment certificates linked via project_id
      if (projs && projs.length > 0) {
        const pIds = projs.map((p: any) => p.id);
        const { data: ipcData } = await supabase
          .from("payment_certificates")
          .select("*")
          .in("project_id", pIds)
          .order("created_at", { ascending: false });
        setIpcs(ipcData || []);
      }

      setLoading(false);
    })();
  }, [id]);

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#F4F5F7] p-10">
      <div className="max-w-6xl mx-auto space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        ))}
      </div>
    </div>
  );

  // ── Not found ───────────────────────────────────────────────────────────────
  if (!contractor) return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center text-slate-400 font-black">
      {t("not_found")}
    </div>
  );

  const totalPaid    = ipcs.filter(i => i.status === "Paid").reduce((s, i) => s + Number(i.net_amount || 0), 0);
  const totalClaimed = ipcs.reduce((s, i) => s + Number(i.gross_amount || 0), 0);
  const activeCount  = projects.filter(p => p.status === "Ongoing").length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F5F7]">

      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link
            href={`/${locale}/admin/contractors`}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          >
            <ArrowLeft size={14} /> {t("back_to_list")}
          </Link>
          <span className="text-slate-200 text-lg">/</span>
          <p className="text-sm font-black uppercase tracking-tight text-slate-900 truncate">
            {contractor.company_name}
          </p>
          {contractor.is_verified ? (
            <span className="flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full shrink-0">
              <ShieldCheck size={9} /> {t("verified_badge")}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[9px] font-black text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full shrink-0">
              <ShieldAlert size={9} /> {t("unverified_badge")}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Profile + KPI grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Profile card */}
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-7 shadow-sm">
            <div className="flex items-start gap-5 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
                <Building2 size={26} className="text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
                  {contractor.company_name}
                </h2>
                <p className="text-slate-400 text-xs mt-1 font-bold">
                  {t("registered_label")}{" "}
                  {new Date(contractor.created_at).toLocaleDateString("en-GB", { dateStyle: "long" })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {[
                { icon: <Hash size={11}/>,     labelKey: "tin_label",           val: contractor.tin_number               },
                { icon: <FileText size={11}/>,  labelKey: "license_label",       val: contractor.license_number           },
                { icon: <Mail size={11}/>,      labelKey: "email_label",         val: contractor.contact_email            },
                { icon: <Phone size={11}/>,     labelKey: "phone_label",         val: contractor.phone_number    || "—"   },
                { icon: <MapPin size={11}/>,    labelKey: "address_label",       val: contractor.physical_address || "—"  },
                { icon: <Calendar size={11}/>,  labelKey: "verified_date_label", val: contractor.verification_date
                  ? new Date(contractor.verification_date).toLocaleDateString("en-GB") : "—" },
              ].map(f => (
                <div key={f.labelKey}>
                  <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    {f.icon} {t(f.labelKey)}
                  </p>
                  <p className="text-sm font-bold text-slate-700 break-all">{f.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
            {[
              { labelKey: "kpi_total_claimed",  val: fmt(totalClaimed), bg: "bg-slate-900",   text: "text-white" },
              { labelKey: "kpi_total_paid",     val: fmt(totalPaid),    bg: "bg-emerald-500", text: "text-white" },
              { labelKey: "kpi_active_sites",   val: activeCount,       bg: "bg-orange-500",  text: "text-white" },
              { labelKey: "kpi_total_projects", val: projects.length,   bg: "bg-white border border-slate-200", text: "text-slate-900" },
            ].map(k => (
              <div key={k.labelKey} className={`rounded-2xl p-4 shadow-sm ${k.bg}`}>
                <p className={`text-[9px] font-black uppercase tracking-widest opacity-60 ${k.text}`}>{t(k.labelKey)}</p>
                <p className={`text-2xl font-black mt-1 ${k.text}`}>{k.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Payment flow explainer ── */}
        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 flex items-start gap-4 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
            <Banknote size={16} className="text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{t("section_ipc")}</p>
            <div className="flex items-center gap-2 flex-wrap text-[10px] font-black">
              {["Submitted","Certified","Approved","Paid"].map((s, i) => (
                <React.Fragment key={s}>
                  <span className={`px-2.5 py-1 rounded-full flex items-center gap-1 ${IPC_STATUS_CSS[s]}`}>
                    {IPC_STATUS_ICON[s]} {t(IPC_STATUS_KEY[s])}
                  </span>
                  {i < 3 && <span className="text-slate-300">→</span>}
                </React.Fragment>
              ))}
              <span className="text-slate-300 mx-1">|</span>
              <span className={`px-2.5 py-1 rounded-full flex items-center gap-1 ${IPC_STATUS_CSS["Rejected"]}`}>
                {IPC_STATUS_ICON["Rejected"]} {t("ipc_status_rejected")}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Contractor submits an IPC → supervisor certifies → office approves → finance marks paid.
              Retention ({ipcs[0]?.retention_pct ?? 10}%) is held until final certificate.
            </p>
          </div>
        </div>

        {/* ── Assigned Projects ── */}
        <section id="projects">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{t("section_projects")}</p>
          {projects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Inbox size={36} className="text-slate-200 mx-auto mb-3" strokeWidth={1} />
              <p className="text-slate-400 font-black">{t("no_projects")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projects.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/${locale}/admin/projects/${p.id}`}
                  className="bg-white border border-slate-200 hover:border-orange-300 hover:shadow-md rounded-2xl p-5 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 text-sm uppercase truncate">{p.name}</p>
                      {p.sector && (
                        <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full mt-1 ${
                          SECTOR_COLOR[p.sector] || "bg-slate-100 text-slate-600"
                        }`}>{p.sector}</span>
                      )}
                    </div>
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full shrink-0 ml-2 ${
                      p.status === "Ongoing"    ? "bg-emerald-100 text-emerald-700"
                      : p.status === "Completed" ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-500"
                    }`}>{p.status}</span>
                  </div>
                  <div className="flex justify-between text-[9px] font-black text-slate-400 mb-1.5">
                    <span>{t("progress_label")}</span>
                    <span className="text-orange-500">{p.progress ?? 0}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full transition-all"
                      style={{ width: `${p.progress ?? 0}%` }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Payment Certificates ── */}
        <section>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
            {t("section_ipc")}
          </p>
          {ipcs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Inbox size={36} className="text-slate-200 mx-auto mb-3" strokeWidth={1} />
              <p className="text-slate-400 font-black">{t("no_ipc")}</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-12 px-6 py-3 bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                <div className="col-span-3">{t("ipc_col_certificate")}</div>
                <div className="col-span-3">{t("ipc_col_gross_net")}</div>
                <div className="col-span-2">{t("ipc_col_work_done")}</div>
                <div className="col-span-3">{t("col_status")}</div>
                <div className="col-span-1" />
              </div>

              {ipcs.map((ipc: any, idx: number) => {
                const statusCss  = IPC_STATUS_CSS[ipc.status]  || IPC_STATUS_CSS.Submitted;
                const statusIcon = IPC_STATUS_ICON[ipc.status] || IPC_STATUS_ICON.Submitted;
                const statusKey  = IPC_STATUS_KEY[ipc.status]  || "ipc_status_submitted";
                const isOpen     = expanded === ipc.id;

                return (
                  <div key={ipc.id} className={idx < ipcs.length - 1 ? "border-b border-slate-100" : ""}>
                    <div
                      className="grid grid-cols-12 items-center px-6 py-4 cursor-pointer hover:bg-slate-50/70 transition-colors gap-2"
                      onClick={() => setExpanded(isOpen ? null : ipc.id)}
                    >
                      <div className="col-span-3">
                        <p className="text-xs font-black text-slate-900">{ipc.certificate_number}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{ipc.certificate_type}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-xs font-black text-orange-600">{fmt(Number(ipc.gross_amount))}</p>
                        <p className="text-[9px] text-slate-400 font-bold">
                          {t("ipc_net_label")} {fmt(Number(ipc.net_amount))}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs font-black text-slate-500">
                          {ipc.work_done_pct != null ? `${ipc.work_done_pct}%` : "—"}
                        </span>
                      </div>
                      <div className="col-span-3">
                        <span className={`flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-lg w-fit ${statusCss}`}>
                          {statusIcon} {t(statusKey)}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-end text-slate-300">
                        {isOpen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-5">
                        {[
                          { labelKey: "ipc_claim_date",   val: ipc.claim_date ? new Date(ipc.claim_date).toLocaleDateString("en-GB") : "—" },
                          { labelKey: "ipc_period",       val: ipc.period_from && ipc.period_to
                            ? `${new Date(ipc.period_from).toLocaleDateString("en-GB")} – ${new Date(ipc.period_to).toLocaleDateString("en-GB")}`
                            : "—" },
                          { labelKey: "ipc_retention",    val: `${ipc.retention_pct}% = ${fmt(Number(ipc.retention_amount))}` },
                          { labelKey: "ipc_submitted_by", val: ipc.submitted_by || "—" },
                          { labelKey: "ipc_certified_by", val: ipc.certified_by || "—" },
                          { labelKey: "ipc_approved_by",  val: ipc.approved_by  || "—" },
                          { labelKey: "ipc_payment_ref",  val: ipc.payment_reference || "—" },
                          { labelKey: "ipc_paid_at",      val: ipc.paid_at ? new Date(ipc.paid_at).toLocaleDateString("en-GB") : "—" },
                        ].map(f => (
                          <div key={f.labelKey}>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{t(f.labelKey)}</p>
                            <p className="text-sm font-bold text-slate-700">{f.val}</p>
                          </div>
                        ))}
                        {ipc.notes && (
                          <div className="col-span-2 md:col-span-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{t("ipc_notes")}</p>
                            <p className="text-sm font-bold text-slate-700">{ipc.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}