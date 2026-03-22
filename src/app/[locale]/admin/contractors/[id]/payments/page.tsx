"use client";

import React, { useEffect, useState, use, useCallback } from "react";
import {
  ArrowLeft, Banknote, TrendingUp, Clock, CheckCircle2,
  XCircle, FileText, Plus, ChevronDown, ChevronUp,
  Loader2, AlertTriangle, CheckCheck, Inbox, Building2
} from "lucide-react";
import { createClient } from "@/lib/actions/supabase/clients";
import Link from "next/link";

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

function fmt(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B ETB";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + "M ETB";
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K ETB";
  return n.toLocaleString() + " ETB";
}

const CERT_TYPES   = ["Interim", "Final", "Advance", "Retention Release"];
const STATUS_STEPS = ["Submitted", "Certified", "Approved", "Paid"];

const STATUS_META: Record<string, { bg: string; text: string; border: string }> = {
  Submitted: { bg: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-200"    },
  Certified: { bg: "bg-violet-100",  text: "text-violet-700",  border: "border-violet-200"  },
  Approved:  { bg: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-200"   },
  Paid:      { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  Rejected:  { bg: "bg-red-100",     text: "text-red-700",     border: "border-red-200"     },
};

const STEP_DOT: Record<string, string> = {
  done:    "bg-emerald-500",
  current: "bg-orange-500",
  pending: "bg-slate-200",
  failed:  "bg-red-500",
};

export default function PaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const supabase = createClient();

  const [project,    setProject]    = useState<any>(null);
  const [contract,   setContract]   = useState<any>(null);
  const [contractor, setContractor] = useState<any>(null);
  const [ipcs,       setIpcs]       = useState<IPC[]>([]);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [showForm,   setShowForm]   = useState(false);
  const [loading,    setLoading]    = useState(true);

  const [form, setForm] = useState({
    certificate_type: "Interim", claim_date: new Date().toISOString().split("T")[0],
    period_from: "", period_to: "", work_done_pct: "", gross_amount: "",
    retention_pct: "10", submitted_by: "", notes: "",
  });
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      proj.tender_id
        ? supabase.from("contracts").select("*").eq("tender_id", proj.tender_id).single()
        : Promise.resolve({ data: null }),
      supabase.from("payment_certificates")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
    ]);

    setContract(contractData);
    setIpcs(ipcData || []);

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

  const handleSubmitIPC = async () => {
    if (!form.gross_amount || isNaN(Number(form.gross_amount))) {
      setFormError("Gross amount is required."); return;
    }
    setSaving(true); setFormError(null);

    const { error } = await supabase.from("payment_certificates").insert({
      project_id:       projectId,
      contract_id:      contract?.id || null,
      certificate_number: "AUTO",
      certificate_type: form.certificate_type,
      claim_date:       form.claim_date,
      period_from:      form.period_from  || null,
      period_to:        form.period_to    || null,
      work_done_pct:    form.work_done_pct ? parseInt(form.work_done_pct) : null,
      gross_amount:     Number(form.gross_amount),
      retention_pct:    Number(form.retention_pct),
      submitted_by:     form.submitted_by || null,
      notes:            form.notes        || null,
      status:           "Submitted",
    });

    setSaving(false);
    if (error) { setFormError(error.message); return; }

    setShowForm(false);
    setForm({ certificate_type:"Interim", claim_date: new Date().toISOString().split("T")[0],
      period_from:"", period_to:"", work_done_pct:"", gross_amount:"",
      retention_pct:"10", submitted_by:"", notes:"" });
    load();
  };

  const advanceStatus = async (ipc: IPC) => {
    const nextMap: Record<string,string> = { Submitted:"Certified", Certified:"Approved", Approved:"Paid" };
    const next = nextMap[ipc.status];
    if (!next) return;
    const patch: Record<string,any> = { status: next };
    if (next === "Certified") patch.certified_at = new Date().toISOString();
    if (next === "Approved")  patch.approved_at  = new Date().toISOString();
    if (next === "Paid")      patch.paid_at       = new Date().toISOString();
    await supabase.from("payment_certificates").update(patch).eq("id", ipc.id);
    load();
  };

  const totalClaimed  = ipcs.reduce((s, i) => s + Number(i.gross_amount), 0);
  const totalPaid     = ipcs.filter(i => i.status === "Paid").reduce((s, i) => s + Number(i.net_amount), 0);
  const totalRetained = ipcs.filter(i => i.status === "Paid").reduce((s, i) => s + Number(i.retention_amount), 0);
  const contractVal   = Number(contract?.signed_amount || project?.budget || 0);
  const paidPct       = contractVal > 0 ? Math.min((totalPaid / contractVal) * 100, 100) : 0;

  return (
    <>
      <div className="min-h-screen bg-[#F4F5F7]">

        {/* ── Top bar ── */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/admin/construction-tracking"
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors shrink-0">
                <ArrowLeft size={13} /> Monitoring
              </Link>
              <span className="text-slate-200">/</span>
              <p className="text-sm font-black uppercase tracking-tight text-slate-900 truncate">
                {loading ? <span className="text-slate-300">Loading…</span> : project?.name}
              </p>
              <span className="text-slate-200">/</span>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest shrink-0">Payments</p>
            </div>
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              <Plus size={13} /> New Certificate
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
              {/* ── Contract summary card ── */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-7">
                <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
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
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Contract Value</p>
                      <p className="text-2xl font-black text-orange-600">{fmt(contractVal)}</p>
                    </div>
                    {contract && (
                      <span className={`text-[9px] font-black px-3 py-1.5 rounded-full ${
                        STATUS_META[contract.payment_status]?.bg || "bg-slate-100"
                      } ${STATUS_META[contract.payment_status]?.text || "text-slate-500"}`}>
                        {contract.payment_status || "Pending"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Payment progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-black text-slate-400">
                    <span>Paid to date</span>
                    <span className="text-emerald-600">{fmt(totalPaid)} ({paidPct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: `${paidPct}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                    <span>Retention held: {fmt(totalRetained)}</span>
                    <span>Total claimed: {fmt(totalClaimed)}</span>
                  </div>
                </div>
              </div>

              {/* ── KPI mini strip ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Certificates",     val: ipcs.length,                                                          bg: "bg-slate-900",    text: "text-white"         },
                  { label: "Paid",              val: ipcs.filter(i => i.status === "Paid").length,                         bg: "bg-emerald-500",  text: "text-white"         },
                  { label: "Pending Approval",  val: ipcs.filter(i => ["Submitted","Certified"].includes(i.status)).length, bg: "bg-amber-400",    text: "text-white"         },
                  { label: "Rejected",          val: ipcs.filter(i => i.status === "Rejected").length,                     bg: "bg-white border border-slate-200", text: "text-slate-900" },
                ].map(k => (
                  <div key={k.label} className={`rounded-2xl p-4 shadow-sm ${k.bg}`}>
                    <p className={`text-[9px] font-black uppercase tracking-widest opacity-60 ${k.text}`}>{k.label}</p>
                    <p className={`text-3xl font-black mt-1 ${k.text}`}>{k.val}</p>
                  </div>
                ))}
              </div>

              {/* ── New IPC Form ── */}
              {showForm && (
                <div className="bg-white rounded-3xl border border-orange-200 shadow-sm p-7 space-y-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">New Payment Certificate</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <IField label="Certificate Type">
                      <select value={form.certificate_type}
                        onChange={e => setForm(f => ({...f, certificate_type: e.target.value}))} className={INP}>
                        {CERT_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </IField>
                    <IField label="Claim Date">
                      <input type="date" value={form.claim_date}
                        onChange={e => setForm(f => ({...f, claim_date: e.target.value}))} className={INP} />
                    </IField>
                    <IField label="Work Done %">
                      <input type="number" placeholder="0–100" min={0} max={100}
                        value={form.work_done_pct}
                        onChange={e => setForm(f => ({...f, work_done_pct: e.target.value}))} className={INP} />
                    </IField>
                    <IField label="Period From">
                      <input type="date" value={form.period_from}
                        onChange={e => setForm(f => ({...f, period_from: e.target.value}))} className={INP} />
                    </IField>
                    <IField label="Period To">
                      <input type="date" value={form.period_to}
                        onChange={e => setForm(f => ({...f, period_to: e.target.value}))} className={INP} />
                    </IField>
                    <IField label="Submitted By">
                      <input type="text" placeholder="Engineer name"
                        value={form.submitted_by}
                        onChange={e => setForm(f => ({...f, submitted_by: e.target.value}))} className={INP} />
                    </IField>
                    <IField label="Gross Amount (ETB)" required>
                      <input type="number" placeholder="e.g. 5000000"
                        value={form.gross_amount}
                        onChange={e => setForm(f => ({...f, gross_amount: e.target.value}))} className={INP} />
                    </IField>
                    <IField label="Retention %">
                      <input type="number" placeholder="10" min={0} max={50}
                        value={form.retention_pct}
                        onChange={e => setForm(f => ({...f, retention_pct: e.target.value}))} className={INP} />
                    </IField>

                    {/* Live preview */}
                    {form.gross_amount && (
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-col justify-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Preview</p>
                        <p className="text-[11px] text-slate-500 font-bold">
                          Retention: <span className="text-amber-600 font-black">
                            {fmt(Number(form.gross_amount) * Number(form.retention_pct) / 100)}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 font-bold mt-1">
                          Net payable: <span className="text-emerald-600 font-black">
                            {fmt(Number(form.gross_amount) * (1 - Number(form.retention_pct) / 100))}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  <IField label="Notes">
                    <textarea rows={2} placeholder="Optional notes…"
                      value={form.notes}
                      onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                      className={INP + " resize-none"} />
                  </IField>

                  {formError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs font-bold">
                      <AlertTriangle size={13} /> {formError}
                    </div>
                  )}

                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setShowForm(false)}
                      className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-slate-700 border border-slate-200 hover:border-slate-400 transition-all">
                      Cancel
                    </button>
                    <button onClick={handleSubmitIPC} disabled={saving}
                      className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50">
                      {saving ? <><Loader2 size={13} className="animate-spin"/> Saving…</> : "Submit Certificate"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── IPC list ── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Payment Certificates</p>
                {ipcs.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center">
                    <Inbox size={36} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-black">No certificates yet</p>
                    <p className="text-slate-300 text-xs mt-1">Submit the first payment certificate to begin tracking.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-12 px-6 py-3 bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <div className="col-span-3">Certificate</div>
                      <div className="col-span-3">Gross / Net</div>
                      <div className="col-span-2">Work Done</div>
                      <div className="col-span-3">Pipeline</div>
                      <div className="col-span-1" />
                    </div>

                    {ipcs.map((ipc, idx) => {
                      const meta     = STATUS_META[ipc.status] || STATUS_META.Submitted;
                      const isOpen   = expanded === ipc.id;
                      const stepIdx  = STATUS_STEPS.indexOf(ipc.status);
                      const canAdvance = stepIdx >= 0 && stepIdx < STATUS_STEPS.length - 1 && ipc.status !== "Rejected";

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
                              <p className="text-[9px] text-slate-400 font-bold">Net {fmt(Number(ipc.net_amount))}</p>
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
                                  <div className={`w-2.5 h-2.5 rounded-full ${
                                    ipc.status === "Rejected" && i === stepIdx ? "bg-red-500"
                                    : i < stepIdx  ? "bg-emerald-500"
                                    : i === stepIdx ? "bg-orange-500"
                                    : "bg-slate-200"
                                  }`} title={s} />
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

                          {isOpen && (
                            <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-5 space-y-5">
                              {/* Status badge */}
                              <div className="flex items-center justify-between flex-wrap gap-3">
                                <span className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-lg ${meta.bg} ${meta.text}`}>
                                  {ipc.status}
                                </span>
                                {ipc.claim_date && (
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    Claimed {new Date(ipc.claim_date).toLocaleDateString("en-GB")}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                  { label: "Period",       val: ipc.period_from ? `${new Date(ipc.period_from).toLocaleDateString("en-GB")} → ${ipc.period_to ? new Date(ipc.period_to).toLocaleDateString("en-GB") : "?"}` : "—" },
                                  { label: `Retention (${ipc.retention_pct}%)`, val: fmt(Number(ipc.retention_amount)) },
                                  { label: "Net Payable",  val: fmt(Number(ipc.net_amount)) },
                                  { label: "Submitted By", val: ipc.submitted_by || "—" },
                                  { label: "Certified By", val: ipc.certified_by || "—" },
                                  { label: "Approved By",  val: ipc.approved_by  || "—" },
                                  { label: "Payment Ref",  val: ipc.payment_reference || "—" },
                                  { label: "Paid At",      val: ipc.paid_at ? new Date(ipc.paid_at).toLocaleDateString("en-GB") : "—" },
                                ].map(f => (
                                  <div key={f.label}>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{f.label}</p>
                                    <p className="text-sm font-bold text-slate-700">{f.val}</p>
                                  </div>
                                ))}
                              </div>

                              {ipc.notes && (
                                <p className="text-sm text-slate-600 border-t border-slate-200 pt-3">{ipc.notes}</p>
                              )}

                              {canAdvance && (
                                <div className="flex justify-end pt-1">
                                  <button
                                    onClick={e => { e.stopPropagation(); advanceStatus(ipc); }}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                  >
                                    <CheckCheck size={13} />
                                    Mark as {STATUS_STEPS[stepIdx + 1]}
                                  </button>
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
    </>
  );
}

const INP = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 focus:bg-white transition-all";

function IField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
        {label}{required && <span className="text-orange-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}