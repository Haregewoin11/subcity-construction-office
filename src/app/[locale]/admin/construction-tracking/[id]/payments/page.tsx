"use client";
// src/app/[locale]/admin/construction-tracking/[id]/payments/page.tsx

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  ArrowLeft, Banknote, Clock, CheckCircle2,
  XCircle, FileText, Plus, ChevronDown, ChevronUp,
  Loader2, AlertTriangle, CheckCheck, Inbox, Building2,
} from "lucide-react";
import { createClient } from "@/lib/actions/supabase/clients";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────
type IPC = {
  id: string;
  certificate_number: string;
  certificate_type: string;
  claim_date: string;
  period_from: string | null;
  period_to: string | null;
  work_done_pct: number | null;
  gross_amount: number;
  retention_pct: number;
  retention_amount: number;
  net_amount: number;
  status: string;
  submitted_by: string | null;
  certified_by: string | null;
  certified_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  notes: string | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const CERT_TYPES   = ["Interim", "Final", "Advance", "Retention Release"] as const;
const STATUS_STEPS = ["Submitted", "Certified", "Approved", "Paid"] as const;

// Status → step key map (for t() lookup — no hardcoded labels)
const STEP_KEY: Record<string, string> = {
  Submitted: "step_submitted",
  Certified: "step_certified",
  Approved:  "step_approved",
  Paid:      "step_paid",
  Rejected:  "step_rejected",
};

const STATUS_CSS: Record<string, string> = {
  Submitted: "bg-blue-100 text-blue-700",
  Certified: "bg-violet-100 text-violet-700",
  Approved:  "bg-amber-100 text-amber-700",
  Paid:      "bg-emerald-100 text-emerald-700",
  Rejected:  "bg-red-100 text-red-700",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B ETB";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + "M ETB";
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K ETB";
  return n.toLocaleString() + " ETB";
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}

const EMPTY_FORM = {
  certificate_type: "Interim" as string,
  claim_date:       new Date().toISOString().split("T")[0],
  period_from:      "",
  period_to:        "",
  work_done_pct:    "",
  gross_amount:     "",
  retention_pct:    "10",
  submitted_by:     "",
  notes:            "",
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PaymentsPage({ params }: { params: { id: string } }) {
  const projectId = params.id;

  const t        = useTranslations("Admin.payments");
  const locale   = useLocale();
  const supabase = useRef(createClient()).current;

  const [project,    setProject]    = useState<any>(null);
  const [contract,   setContract]   = useState<any>(null);
  const [contractor, setContractor] = useState<any>(null);
  const [ipcs,       setIpcs]       = useState<IPC[]>([]);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [showForm,   setShowForm]   = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [advancing,  setAdvancing]  = useState<string | null>(null);   // ipc id being advanced
  const [rejecting,  setRejecting]  = useState<string | null>(null);   // ipc id being rejected

  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);

    const { data: proj } = await supabase
      .from("projects")
      .select("id, name, sector, status, progress, budget, contractor_id, tender_id")
      .eq("id", projectId)
      .single();

    setProject(proj);
    if (!proj) { setLoading(false); return; }

    const [{ data: contractData }, { data: ipcData }] = await Promise.all([
      proj.tender_id && proj.tender_id !== "id"
        ? supabase.from("contracts").select("*").eq("tender_id", proj.tender_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("payment_certificates")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
    ]);

    setContract(contractData ?? null);
    setIpcs((ipcData as IPC[]) || []);

    if (proj.contractor_id) {
      const { data: ctc } = await supabase
        .from("contractors")
        .select("id, company_name, is_verified")
        .eq("id", proj.contractor_id)
        .single();
      setContractor(ctc);
    }

    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  // ── Submit new IPC ────────────────────────────────────────────────────────
  const handleSubmitIPC = async () => {
    if (!form.gross_amount || isNaN(Number(form.gross_amount))) {
      setFormError(t("form_error_gross")); return;
    }
    setSaving(true); setFormError(null);

    // Generate cert number via DB function
    const certNum = `${form.certificate_type === "Interim" ? "IPC"
      : form.certificate_type === "Final"            ? "FPC"
      : form.certificate_type === "Advance"          ? "APC"
      : "RPC"}-${new Date().getFullYear()}-${String(ipcs.length + 1).padStart(3, "0")}`;

    const { error } = await supabase.from("payment_certificates").insert({
      project_id:         projectId,
      contract_id:        contract?.id ?? null,
      certificate_number: certNum,
      certificate_type:   form.certificate_type,
      claim_date:         form.claim_date,
      period_from:        form.period_from   || null,
      period_to:          form.period_to     || null,
      work_done_pct:      form.work_done_pct ? parseInt(form.work_done_pct) : null,
      gross_amount:       Number(form.gross_amount),
      retention_pct:      Number(form.retention_pct),
      submitted_by:       form.submitted_by  || null,
      notes:              form.notes         || null,
      status:             "Submitted",
    });

    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setShowForm(false);
    setForm(EMPTY_FORM);
    load();
  };

  // ── Advance status ────────────────────────────────────────────────────────
  const advanceStatus = async (ipc: IPC) => {
    const nextMap: Record<string, string> = {
      Submitted: "Certified",
      Certified: "Approved",
      Approved:  "Paid",
    };
    const next = nextMap[ipc.status];
    if (!next) return;
    setAdvancing(ipc.id);
    const patch: Record<string, any> = { status: next };
    if (next === "Certified") patch.certified_at = new Date().toISOString();
    if (next === "Approved")  patch.approved_at  = new Date().toISOString();
    if (next === "Paid")      patch.paid_at       = new Date().toISOString();
    await supabase.from("payment_certificates").update(patch).eq("id", ipc.id);
    setAdvancing(null);
    load();
  };

  // ── Reject ────────────────────────────────────────────────────────────────
  const rejectIPC = async (ipc: IPC) => {
    setRejecting(ipc.id);
    await supabase.from("payment_certificates")
      .update({ status: "Rejected" })
      .eq("id", ipc.id);
    setRejecting(null);
    load();
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const totalClaimed  = ipcs.reduce((s, i) => s + Number(i.gross_amount), 0);
  const totalPaid     = ipcs.filter(i => i.status === "Paid").reduce((s, i) => s + Number(i.net_amount), 0);
  const totalRetained = ipcs.filter(i => i.status === "Paid").reduce((s, i) => s + Number(i.retention_amount), 0);
  const contractVal   = Number(contract?.signed_amount || project?.budget || 0);
  const paidPct       = contractVal > 0 ? Math.min((totalPaid / contractVal) * 100, 100) : 0;

  // live preview for form
  const grossNum     = Number(form.gross_amount) || 0;
  const retentionAmt = grossNum * (Number(form.retention_pct) / 100);
  const netAmt       = grossNum - retentionAmt;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F5F7]">

      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/${locale}/admin/construction-tracking`}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors shrink-0">
              <ArrowLeft size={13} /> {t("breadcrumb_monitoring")}
            </Link>
            <span className="text-slate-200">/</span>
            <p className="text-sm font-black uppercase tracking-tight text-slate-900 truncate">
              {loading ? <span className="text-slate-300">{t("loading")}</span> : project?.name}
            </p>
            <span className="text-slate-200">/</span>
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest shrink-0">
              {t("breadcrumb_payments")}
            </p>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setFormError(null); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
            <Plus size={13} /> {t("new_certificate")}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Contract summary card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-7">
              <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {contractor && (
                      <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                        <Building2 size={9} /> {contractor.company_name}
                      </span>
                    )}
                    {contract?.contract_ref && (
                      <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                        {contract.contract_ref}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">{project?.name}</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{t("contract_value")}</p>
                    <p className="text-2xl font-black text-orange-600">{fmt(contractVal)}</p>
                  </div>
                  {contract?.payment_status && (
                    <span className={`text-[9px] font-black px-3 py-1.5 rounded-full ${
                      STATUS_CSS[contract.payment_status] ?? "bg-slate-100 text-slate-500"
                    }`}>
                      {t(STEP_KEY[contract.payment_status] ?? "step_submitted")}
                    </span>
                  )}
                </div>
              </div>

              {/* Payment progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-black text-slate-400">
                  <span>{t("paid_to_date")}</span>
                  <span className="text-emerald-600">{fmt(totalPaid)} ({paidPct.toFixed(1)}%)</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                    style={{ width: `${paidPct}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                  <span>{t("retention_held")}: {fmt(totalRetained)}</span>
                  <span>{t("total_claimed")}: {fmt(totalClaimed)}</span>
                </div>
              </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { labelKey: "kpi_certificates",   val: ipcs.length,                                                          bg: "bg-slate-900",   text: "text-white" },
                { labelKey: "kpi_paid",            val: ipcs.filter(i => i.status === "Paid").length,                         bg: "bg-emerald-500", text: "text-white" },
                { labelKey: "kpi_pending_approval",val: ipcs.filter(i => ["Submitted","Certified"].includes(i.status)).length, bg: "bg-amber-400",   text: "text-white" },
                { labelKey: "kpi_rejected",        val: ipcs.filter(i => i.status === "Rejected").length,                     bg: "bg-white border border-slate-200", text: "text-slate-900" },
              ].map(k => (
                <div key={k.labelKey} className={`rounded-2xl p-4 shadow-sm ${k.bg}`}>
                  <p className={`text-[9px] font-black uppercase tracking-widest opacity-60 ${k.text}`}>{t(k.labelKey)}</p>
                  <p className={`text-3xl font-black mt-1 ${k.text}`}>{k.val}</p>
                </div>
              ))}
            </div>

            {/* New IPC Form */}
            {showForm && (
              <div className="bg-white rounded-3xl border border-orange-200 shadow-sm p-7 space-y-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">{t("form_section_title")}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <IF label={t("form_cert_type")}>
                    <select value={form.certificate_type}
                      onChange={e => setForm(f => ({...f, certificate_type: e.target.value}))} className={INP}>
                      {CERT_TYPES.map(ct => <option key={ct}>{ct}</option>)}
                    </select>
                  </IF>
                  <IF label={t("form_claim_date")}>
                    <input type="date" value={form.claim_date}
                      onChange={e => setForm(f => ({...f, claim_date: e.target.value}))} className={INP} />
                  </IF>
                  <IF label={t("form_work_done")}>
                    <input type="number" placeholder="0–100" min={0} max={100}
                      value={form.work_done_pct}
                      onChange={e => setForm(f => ({...f, work_done_pct: e.target.value}))} className={INP} />
                  </IF>
                  <IF label={t("form_period_from")}>
                    <input type="date" value={form.period_from}
                      onChange={e => setForm(f => ({...f, period_from: e.target.value}))} className={INP} />
                  </IF>
                  <IF label={t("form_period_to")}>
                    <input type="date" value={form.period_to}
                      onChange={e => setForm(f => ({...f, period_to: e.target.value}))} className={INP} />
                  </IF>
                  <IF label={t("form_submitted_by")}>
                    <input type="text" placeholder={t("form_submitted_placeholder")}
                      value={form.submitted_by}
                      onChange={e => setForm(f => ({...f, submitted_by: e.target.value}))} className={INP} />
                  </IF>
                  <IF label={t("form_gross_amount")} required>
                    <input type="number" placeholder={t("form_gross_placeholder")}
                      value={form.gross_amount}
                      onChange={e => setForm(f => ({...f, gross_amount: e.target.value}))} className={INP} />
                  </IF>
                  <IF label={t("form_retention_pct")}>
                    <input type="number" placeholder="10" min={0} max={50}
                      value={form.retention_pct}
                      onChange={e => setForm(f => ({...f, retention_pct: e.target.value}))} className={INP} />
                  </IF>

                  {/* Live preview */}
                  {grossNum > 0 && (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-col justify-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">{t("form_preview")}</p>
                      <p className="text-[11px] text-slate-500 font-bold">
                        {t("form_preview_retention")}:{" "}
                        <span className="text-amber-600 font-black">{fmt(retentionAmt)}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-bold mt-1">
                        {t("form_preview_net")}:{" "}
                        <span className="text-emerald-600 font-black">{fmt(netAmt)}</span>
                      </p>
                    </div>
                  )}
                </div>

                <IF label={t("form_notes")}>
                  <textarea rows={2} placeholder={t("form_notes_placeholder")}
                    value={form.notes}
                    onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                    className={INP + " resize-none"} />
                </IF>

                {formError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs font-bold">
                    <AlertTriangle size={13} /> {formError}
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button onClick={() => { setShowForm(false); setFormError(null); }}
                    className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-slate-700 border border-slate-200 hover:border-slate-400 transition-all">
                    {t("form_cancel")}
                  </button>
                  <button onClick={handleSubmitIPC} disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50">
                    {saving
                      ? <><Loader2 size={13} className="animate-spin"/> {t("form_saving")}</>
                      : t("form_submit")}
                  </button>
                </div>
              </div>
            )}

            {/* IPC list */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{t("section_ipc")}</p>
              {ipcs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center">
                  <Inbox size={36} className="text-slate-200 mx-auto mb-3" strokeWidth={1} />
                  <p className="text-slate-400 font-black">{t("no_ipc")}</p>
                  <p className="text-slate-300 text-xs mt-1">{t("no_ipc_body")}</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-12 px-6 py-3 bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <div className="col-span-3">{t("col_certificate")}</div>
                    <div className="col-span-3">{t("col_gross_net")}</div>
                    <div className="col-span-2">{t("col_work_done")}</div>
                    <div className="col-span-3">{t("col_pipeline")}</div>
                    <div className="col-span-1" />
                  </div>

                  {ipcs.map((ipc, idx) => {
                    const statusCss  = STATUS_CSS[ipc.status] ?? STATUS_CSS.Submitted;
                    const stepIdx    = STATUS_STEPS.indexOf(ipc.status as any);
                    const canAdvance = stepIdx >= 0 && stepIdx < STATUS_STEPS.length - 1 && ipc.status !== "Rejected";
                    const canReject  = ipc.status !== "Paid" && ipc.status !== "Rejected";
                    const isOpen     = expanded === ipc.id;
                    const isAdv      = advancing === ipc.id;
                    const isRej      = rejecting === ipc.id;

                    return (
                      <div key={ipc.id} className={idx < ipcs.length - 1 ? "border-b border-slate-100" : ""}>

                        {/* Row */}
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
                              {t("net_label")} {fmt(Number(ipc.net_amount))}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs font-black text-slate-500">
                              {ipc.work_done_pct != null ? `${ipc.work_done_pct}%` : "—"}
                            </span>
                          </div>
                          {/* Pipeline dots */}
                          <div className="col-span-3 flex items-center gap-1">
                            {STATUS_STEPS.map((s, i) => (
                              <React.Fragment key={s}>
                                <div
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    ipc.status === "Rejected" && i === stepIdx ? "bg-red-500"
                                    : i < stepIdx  ? "bg-emerald-500"
                                    : i === stepIdx ? "bg-orange-500"
                                    : "bg-slate-200"
                                  }`}
                                  title={t(STEP_KEY[s])}
                                />
                                {i < STATUS_STEPS.length - 1 && (
                                  <div className={`flex-1 h-px ${i < stepIdx ? "bg-emerald-300" : "bg-slate-200"}`} />
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                          <div className="col-span-1 flex justify-end text-slate-300">
                            {isOpen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isOpen && (
                          <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-5 space-y-5">

                            {/* Status + claimed date row */}
                            <div className="flex items-center justify-between flex-wrap gap-3">
                              <span className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-lg ${statusCss}`}>
                                {t(STEP_KEY[ipc.status] ?? "step_submitted")}
                              </span>
                              {ipc.claim_date && (
                                <span className="text-[10px] text-slate-400 font-bold">
                                  {t("detail_claimed")} {fmtDate(ipc.claim_date)}
                                </span>
                              )}
                            </div>

                            {/* Detail fields */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {[
                                { labelKey: "detail_period",       val: ipc.period_from
                                  ? `${fmtDate(ipc.period_from)} → ${fmtDate(ipc.period_to)}` : "—" },
                                { labelKey: "ipc_retention",       val: `${ipc.retention_pct}% = ${fmt(Number(ipc.retention_amount))}` },
                                { labelKey: "detail_net_payable",  val: fmt(Number(ipc.net_amount)) },
                                { labelKey: "detail_submitted_by", val: ipc.submitted_by || "—" },
                                { labelKey: "detail_certified_by", val: ipc.certified_by || "—" },
                                { labelKey: "detail_approved_by",  val: ipc.approved_by  || "—" },
                                { labelKey: "detail_payment_ref",  val: ipc.payment_reference || "—" },
                                { labelKey: "detail_paid_at",      val: fmtDate(ipc.paid_at) },
                              ].map(f => (
                                <div key={f.labelKey}>
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                                    {t(f.labelKey)}
                                  </p>
                                  <p className="text-sm font-bold text-slate-700">{f.val}</p>
                                </div>
                              ))}
                            </div>

                            {ipc.notes && (
                              <p className="text-sm text-slate-600 border-t border-slate-200 pt-3">{ipc.notes}</p>
                            )}

                            {/* Advance + Reject buttons */}
                            {(canAdvance || canReject) && (
                              <div className="flex gap-3 justify-end pt-1 flex-wrap">
                                {canReject && (
                                  <button
                                    onClick={e => { e.stopPropagation(); rejectIPC(ipc); }}
                                    disabled={isRej || isAdv}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all disabled:opacity-50">
                                    {isRej ? <Loader2 size={12} className="animate-spin"/> : <XCircle size={12}/>}
                                    {t("reject_btn")}
                                  </button>
                                )}
                                {canAdvance && (
                                  <button
                                    onClick={e => { e.stopPropagation(); advanceStatus(ipc); }}
                                    disabled={isAdv || isRej}
                                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50">
                                    {isAdv
                                      ? <Loader2 size={13} className="animate-spin"/>
                                      : <CheckCheck size={13}/>}
                                    {/* "Mark as Certified" — concat t("advance_btn") + t(next step key) */}
                                    {t("advance_btn")} {t(STEP_KEY[STATUS_STEPS[stepIdx + 1]] ?? "step_certified")}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const INP = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 focus:bg-white transition-all";

function IF({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
        {label}{required && <span className="text-orange-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}