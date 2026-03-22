"use client";
// src/app/[locale]/admin/tenders/evaluation/page.tsx

import React, { useEffect, useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/actions/supabase/clients";
import {
  CheckCircle2, XCircle, Save, ArrowLeft, ShieldCheck,
  FileText, Download, Calculator, Landmark, AlertCircle, Loader2,
} from "lucide-react";
import Link from "next/link";

type Bid = {
  id: string;
  status: string;
  technical_score: number;
  financial_score: number;
  technical_proposal_url: string | null;
  financial_proposal_url: string | null;
  submitted_at: string;
  tenders?:     { title: string; ref_no: string };
  contractors?: { company_name: string; tin_number: string; license_number: string };
};

export default function EvaluationPage() {
  const t        = useTranslations("Admin.tenders_module");
  const locale   = useLocale();
  const supabase = useRef(createClient()).current;

  const [bids,      setBids]      = useState<Bid[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<"Pending" | "Valid">("Pending");
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function fetchBids() {
    setLoading(true);
    const { data, error } = await supabase
      .from("bids")
      .select("*, tenders(title, ref_no), contractors(company_name, tin_number, license_number)")
      .order("submitted_at", { ascending: false });
    if (error) showToast(error.message, false);
    else setBids((data as Bid[]) || []);
    setLoading(false);
  }

  useEffect(() => { fetchBids(); }, []);

  async function updateBidStatus(id: string, newStatus: string) {
    const { error } = await supabase
      .from("bids")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) showToast(error.message, false);
    else { showToast(`Status → ${newStatus}`, true); fetchBids(); }
  }

  async function commitScores(id: string, tech: number, fin: number) {
    const { error } = await supabase
      .from("bids")
      .update({ technical_score: tech, financial_score: fin, status: "Evaluated" })
      .eq("id", id);
    if (error) showToast(error.message, false);
    else { showToast(t("commit_score"), true); fetchBids(); }
  }

  const pendingBids = bids.filter(b => b.status === "Pending");
  const validBids   = bids.filter(b => b.status === "Valid");
  const tabBids     = activeTab === "Pending" ? pendingBids : validBids;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 md:p-12">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b pb-8 border-slate-200">
          <div className="space-y-2">
            <Link href={`/${locale}/admin/tenders`}
              className="flex items-center gap-2 text-sm font-black uppercase text-slate-400 hover:text-[#0A1628]">
              <ArrowLeft size={16} /> Back
            </Link>
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{t("eval_title")}</h1>
            <p className="text-[15px] font-bold text-slate-500 uppercase tracking-wide">{t("eval_subtitle")}</p>
          </div>
          <div className="px-8 py-4 bg-white border-2 border-slate-100 rounded-[2rem] shadow-sm flex items-center gap-3">
            <ShieldCheck className="text-emerald-500" size={24} />
            <p className="text-sm font-black uppercase text-slate-600">{t("forensic_enabled")}</p>
          </div>
        </header>

        {/* Tabs — count appended in JSX, NOT via t() interpolation */}
        <div className="flex gap-4 p-2 bg-slate-100 w-fit rounded-[2.5rem]">
          <button onClick={() => setActiveTab("Pending")}
            className={`px-10 py-4 rounded-[2rem] text-sm font-black uppercase transition-all ${
              activeTab === "Pending" ? "bg-[#0A1628] text-white shadow-lg" : "text-slate-500"
            }`}>
            {t("tab_validation")} ({pendingBids.length})
          </button>
          <button onClick={() => setActiveTab("Valid")}
            className={`px-10 py-4 rounded-[2rem] text-sm font-black uppercase transition-all ${
              activeTab === "Valid" ? "bg-[#0A1628] text-white shadow-lg" : "text-slate-500"
            }`}>
            {t("tab_scoring")} ({validBids.length})
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 gap-8">
          {loading ? (
            <div className="p-20 text-center flex items-center justify-center gap-3 text-slate-400">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-xl font-black animate-pulse uppercase tracking-widest">
                {t("accessing_registry")}
              </span>
            </div>
          ) : tabBids.length === 0 ? (
            <div className="bg-white p-32 rounded-[4rem] text-center border-2 border-dashed border-slate-200">
              <AlertCircle size={64} className="mx-auto text-slate-200 mb-4" />
              {/* Plain t() call — no interpolation variables */}
              <p className="text-xl font-black text-slate-400 uppercase tracking-widest">
                {t("no_nodes")}
              </p>
            </div>
          ) : tabBids.map(bid => (
            <EvaluationRow
              key={bid.id}
              bid={bid}
              mode={activeTab}
              onUpdateStatus={updateBidStatus}
              onCommit={commitScores}
              labels={{
                technical: t("label_technical_max"),
                financial: t("label_financial_max"),
                approve:   t("approve_docs"),
                commit:    t("commit_score"),
                techDoc:   t("technical_doc"),
                finDoc:    t("financial_doc"),
                aggregate: t("aggregate_label"),
                forensic:  t("forensic_confirmed"),
              }}
            />
          ))}
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold text-white z-50 flex items-center gap-3 ${
          toast.ok ? "bg-green-600" : "bg-red-500"
        }`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Row component ─────────────────────────────────────────────────────────────
type Labels = {
  technical: string; financial: string; approve: string; commit: string;
  techDoc: string; finDoc: string; aggregate: string; forensic: string;
};

function EvaluationRow({ bid, mode, onUpdateStatus, onCommit, labels }: {
  bid: Bid;
  mode: "Pending" | "Valid";
  onUpdateStatus: (id: string, s: string) => Promise<void>;
  onCommit: (id: string, tech: number, fin: number) => Promise<void>;
  labels: Labels;
}) {
  const [tech,   setTech]   = useState(bid.technical_score || 0);
  const [fin,    setFin]    = useState(bid.financial_score  || 0);
  const [saving, setSaving] = useState(false);

  async function handleCommit() {
    setSaving(true);
    await onCommit(bid.id, tech, fin);
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-slate-100 hover:shadow-2xl transition-all relative overflow-hidden">
      <div className="grid lg:grid-cols-12 gap-10 items-center">

        {/* Identity */}
        <div className="lg:col-span-4 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-black text-[#0A1628] font-mono uppercase tracking-tighter">{bid.tenders?.ref_no}</p>
            <h3 className="text-2xl font-black text-slate-800 leading-tight">{bid.tenders?.title}</h3>
          </div>
          <div className="p-5 bg-slate-50 rounded-3xl flex items-center gap-4">
            <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-[#0A1628] shadow-sm">
              <Landmark size={24} />
            </div>
            <div>
              <p className="text-lg font-black text-slate-700">{bid.contractors?.company_name || "Unknown"}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                TIN: {bid.contractors?.tin_number} | LIC: {bid.contractors?.license_number}
              </p>
            </div>
          </div>
        </div>

        {/* Phase 1: Document Validation */}
        {mode === "Pending" && (
          <div className="lg:col-span-8 flex flex-col md:flex-row gap-6 items-center justify-end">
            <div className="flex gap-3">
              <a href={bid.technical_proposal_url ?? "#"} target="_blank" rel="noopener noreferrer"
                className="px-8 py-5 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase flex items-center gap-2 hover:bg-[#0A1628] hover:text-white transition-all">
                <FileText size={18} /> {labels.techDoc}
              </a>
              <a href={bid.financial_proposal_url ?? "#"} target="_blank" rel="noopener noreferrer"
                className="px-8 py-5 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase flex items-center gap-2 hover:bg-[#0A1628] hover:text-white transition-all">
                <Download size={18} /> {labels.finDoc}
              </a>
            </div>
            <div className="h-10 w-[2px] bg-slate-100 hidden md:block" />
            <div className="flex gap-3">
              <button onClick={() => onUpdateStatus(bid.id, "Valid")}
                className="px-10 py-5 bg-emerald-600 text-white rounded-2xl flex items-center gap-3 shadow-lg hover:bg-emerald-700 transition-all">
                <CheckCircle2 size={24} />
                <span className="text-xs font-black uppercase tracking-widest">{labels.approve}</span>
              </button>
              <button onClick={() => onUpdateStatus(bid.id, "Rejected")}
                className="p-5 bg-rose-100 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all">
                <XCircle size={24} />
              </button>
            </div>
          </div>
        )}

        {/* Phase 2: Scoring Console */}
        {mode === "Valid" && (
          <div className="lg:col-span-8 grid md:grid-cols-3 gap-6 items-center">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">{labels.technical}</label>
              <input type="number" min="0" max="70" value={tech}
                onChange={e => setTech(Number(e.target.value))}
                className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-[#0A1628] rounded-3xl font-black text-xl text-center outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">{labels.financial}</label>
              <input type="number" min="0" max="30" value={fin}
                onChange={e => setFin(Number(e.target.value))}
                className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-3xl font-black text-xl text-center outline-none transition-all" />
            </div>
            <div className="pt-6">
              <button onClick={handleCommit} disabled={saving}
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={20} className="text-amber-400" />}
                {labels.commit}
              </button>
            </div>
          </div>
        )}
      </div>

      {mode === "Valid" && (
        <div className="mt-8 pt-8 border-t border-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <Calculator size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{labels.aggregate}</p>
              <p className="text-2xl font-black text-slate-900">
                {(tech + fin).toFixed(2)} <span className="text-sm opacity-30">/ 100.00</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">
            <ShieldCheck size={16} /> {labels.forensic}
          </div>
        </div>
      )}
    </div>
  );
}