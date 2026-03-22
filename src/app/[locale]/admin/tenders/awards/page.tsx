"use client";
// src/app/[locale]/admin/tenders/awards/page.tsx

import React, { useEffect, useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/actions/supabase/clients";
import {
  ArrowLeft, FileSignature, Trophy, Loader2,
  CheckCircle2, AlertCircle, ExternalLink, Calendar, ArrowRight, Layers,
} from "lucide-react";
import Link from "next/link";

type AwardedTender = {
  tender_id: string; ref_no: string; title: string; status: string;
  budget_estimate: number; currency: string; project_id: string | null;
  projects?: { id: string; name: string; location: string; status: string } | null;
  winning_submission?: {
    id: string; company_name: string; contact_email: string;
    financial_offer: number; currency: string; submission_ref: string;
  } | null;
};

type Contract = {
  id: string; tender_id: string; contract_ref: string; signed_amount: number;
  start_date: string; end_date: string; signed_contract_url: string; payment_status: string;
};

function emptyForm() {
  return { start_date: "", end_date: "", signed_contract_url: "", uploading: false };
}

export default function AwardsPage() {
  const t        = useTranslations("Admin.tenders_module");
  const locale   = useLocale();
  const supabase = useRef(createClient()).current;

  const [awardedTenders, setAwardedTenders] = useState<AwardedTender[]>([]);
  const [contracts,      setContracts]      = useState<Contract[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [processing,     setProcessing]     = useState<string | null>(null);
  const [toast,          setToast]          = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [contractForm,   setContractForm]   = useState<Record<string, ReturnType<typeof emptyForm>>>({});

  async function load() {
    setLoading(true);
    const { data: tData } = await supabase
      .from("tenders")
      .select(`tender_id,ref_no,title,status,budget_estimate,currency,project_id,
        projects!tenders_project_id_fkey(id,name,location,status)`)
      .in("status", ["Awarded", "Contract Signed"])
      .order("updated_at", { ascending: false });

    const tenders = (tData as AwardedTender[]) || [];
    const tids    = tenders.map(t => t.tender_id);

    // fetch winning bid_submission for each tender
    const winMap: Record<string, AwardedTender["winning_submission"]> = {};
    if (tids.length > 0) {
      const { data: wData } = await supabase
        .from("bid_submissions")
        .select("id,tender_id,company_name,contact_email,financial_offer,currency,submission_ref")
        .in("tender_id", tids)
        .eq("is_winner", true);
      for (const w of wData ?? []) winMap[w.tender_id] = w as AwardedTender["winning_submission"];
    }

    setAwardedTenders(tenders.map(t => ({ ...t, winning_submission: winMap[t.tender_id] ?? null })));

    const { data: cData } = await supabase
      .from("contracts")
      .select("id,tender_id,contract_ref,signed_amount,start_date,end_date,signed_contract_url,payment_status")
      .order("created_at", { ascending: false });
    setContracts((cData as Contract[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type }); setTimeout(() => setToast(null), 5000);
  }

  function patchForm(tid: string, patch: Partial<ReturnType<typeof emptyForm>>) {
    setContractForm(f => ({ ...f, [tid]: { ...(f[tid] ?? emptyForm()), ...patch } }));
  }

  // Upload contract PDF to the public "procurement" bucket
  async function handleFileUpload(tenderId: string, file: File) {
    patchForm(tenderId, { uploading: true });
    const path = `contracts/${tenderId}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const { error } = await supabase.storage.from("procurement").upload(path, file, { upsert: true });
    if (error) {
      showToast(t("toast_upload_fail", { msg: error.message }), "error");
      patchForm(tenderId, { uploading: false });
      return;
    }
    const { data: urlData } = supabase.storage.from("procurement").getPublicUrl(path);
    patchForm(tenderId, { signed_contract_url: urlData.publicUrl, uploading: false });
    showToast(t("toast_upload_success"), "success");
  }

  // Save contract → flip tender to Contract Signed → advance project to Design Phase → seed design_submissions
  async function handleCreateContract(tender: AwardedTender) {
    const form = contractForm[tender.tender_id] ?? emptyForm();
    if (!form.signed_contract_url) { showToast(t("toast_no_file"),  "error"); return; }
    if (!form.start_date || !form.end_date) { showToast(t("toast_no_dates"), "error"); return; }
    setProcessing(tender.tender_id);

    const contract_ref = `CTR-${tender.ref_no}`;
    const signedAmount = tender.winning_submission?.financial_offer ?? tender.budget_estimate;

    // 1. Insert contract (upsert on duplicate ref)
    const { error: cErr } = await supabase.from("contracts").insert({
      tender_id: tender.tender_id, winner_id: null, contract_ref,
      signed_amount: signedAmount, start_date: form.start_date, end_date: form.end_date,
      signed_contract_url: form.signed_contract_url, payment_status: "Pending",
    });
    if (cErr && cErr.code !== "23505") { showToast(cErr.message, "error"); setProcessing(null); return; }
    if (cErr?.code === "23505") {
      await supabase.from("contracts")
        .update({ signed_contract_url: form.signed_contract_url, start_date: form.start_date, end_date: form.end_date })
        .eq("tender_id", tender.tender_id);
    }

    // 2. Tender → Contract Signed
    await supabase.from("tenders")
      .update({ status: "Contract Signed", updated_at: new Date().toISOString() })
      .eq("tender_id", tender.tender_id);

    // 3. Project → Design Phase (only if still at Planned / Awarded stage)
    if (tender.project_id) {
      await supabase.from("projects")
        .update({ status: "Design Phase", updated_at: new Date().toISOString() })
        .eq("id", tender.project_id)
        .in("status", ["Planned", "Awarded"]);

      // 4. Seed an initial Pending design_submission so Design Review shows it immediately
      const dsTitle = `Initial Design — ${tender.title}`;
      const { data: existing } = await supabase.from("design_submissions")
        .select("id").eq("project_id", tender.project_id).eq("title", dsTitle).maybeSingle();
      if (!existing) {
        await supabase.from("design_submissions").insert({
          project_id:     tender.project_id,
          drawing_type:   "Architectural",
          title:          dsTitle,
          status:         "Pending",
          version_number: 1,
          file_url:       form.signed_contract_url,
        });
      }
    }

    showToast(t("toast_contract_saved"), "success");
    load();
    setProcessing(null);
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/${locale}/admin/tenders`}
            className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-[#2C2C2C]">{t("awards_title")}</h1>
            <p className="text-sm font-bold text-slate-500">{t("awards_subtitle")}</p>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex gap-3">
          <AlertCircle size={18} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700">{t("awards_info")}</p>
        </div>

        {/* Workflow strip */}
        <div className="flex items-center gap-3 mb-8 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm w-fit text-xs font-black uppercase">
          <span className="text-slate-400">Bid Awarded</span>
          <ArrowRight size={12} className="text-slate-300" />
          <span className="text-[#E85D1A]">Upload Contract</span>
          <ArrowRight size={12} className="text-slate-300" />
          <span className="text-emerald-600 flex items-center gap-1.5"><Layers size={11} />Design Phase</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={24} className="animate-spin mr-2" /> {t("loading_short")}
          </div>
        ) : (
          <div className="space-y-6">
            {awardedTenders.length === 0 ? (
              <div className="bg-white rounded-[2rem] border border-slate-200 p-12 text-center">
                <Trophy size={40} className="text-slate-300 mx-auto mb-3" strokeWidth={1} />
                <p className="font-black text-slate-400">{t("no_awarded")}</p>
                <p className="text-sm text-slate-400 mt-1">{t("no_awarded_body")}</p>
              </div>
            ) : awardedTenders.map(tender => {
              const form             = contractForm[tender.tender_id] ?? emptyForm();
              const isContractSigned = tender.status === "Contract Signed";
              const existingContract = contracts.find(c => c.tender_id === tender.tender_id);
              const winner           = tender.winning_submission;
              const proj             = tender.projects;

              return (
                <div key={tender.tender_id}
                  className={`bg-white rounded-[2rem] border shadow-sm overflow-hidden ${
                    isContractSigned ? "border-green-300" : "border-slate-200"
                  }`}>

                  {/* Tender header */}
                  <div className={`p-6 ${isContractSigned ? "bg-green-50" : ""}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-black text-slate-400 font-mono">{tender.ref_no}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isContractSigned ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                          }`}>{tender.status}</span>
                        </div>
                        <h3 className="font-black text-[#2C2C2C] text-lg">{tender.title}</h3>
                        {proj ? (
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-400">Project:</span>
                            <span className="text-xs font-bold text-slate-700">{proj.name}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              proj.status === "Design Phase" ? "bg-violet-100 text-violet-700" :
                              proj.status === "Planned"      ? "bg-sky-100 text-sky-700" :
                              "bg-slate-100 text-slate-500"
                            }`}>{proj.status}</span>
                            {proj.location && <span className="text-[11px] text-slate-400">· {proj.location}</span>}
                          </div>
                        ) : (
                          <p className="mt-1 text-[11px] text-amber-600 font-bold flex items-center gap-1">
                            <AlertCircle size={11} /> No linked project — design phase won't auto-activate
                          </p>
                        )}
                      </div>
                      {isContractSigned && (
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <CheckCircle2 size={28} className="text-green-500" />
                          <span className="text-[9px] font-black text-green-600 uppercase tracking-wide">Signed</span>
                        </div>
                      )}
                    </div>

                    {winner && (
                      <div className="mt-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <Trophy size={15} className="text-amber-500 shrink-0" />
                        <div>
                          <p className="text-xs font-black text-slate-700">{winner.company_name}</p>
                          <p className="text-[11px] text-slate-400">
                            {winner.submission_ref} · Offer:{" "}
                            <span className="font-bold text-slate-600">
                              {Number(winner.financial_offer).toLocaleString()} {winner.currency}
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contract body */}
                  <div className="border-t border-slate-100 p-6">
                    {existingContract?.signed_contract_url ? (
                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase text-slate-400">{t("contract_details")}</p>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div><p className="text-[10px] text-slate-400">{t("label_ref")}</p><p className="font-bold">{existingContract.contract_ref}</p></div>
                          <div><p className="text-[10px] text-slate-400">{t("label_start")}</p><p className="font-bold">{existingContract.start_date || "—"}</p></div>
                          <div><p className="text-[10px] text-slate-400">{t("label_end")}</p><p className="font-bold">{existingContract.end_date || "—"}</p></div>
                        </div>
                        <a href={existingContract.signed_contract_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-black text-[#0A1628] hover:underline">
                          <ExternalLink size={12} /> {t("view_signed")}
                        </a>
                        {proj?.status === "Design Phase" && (
                          <div className="flex items-center gap-2 text-xs font-black text-violet-600 bg-violet-50 rounded-xl px-3 py-2 w-fit mt-2">
                            <Layers size={12} /> Design Phase Active
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase text-slate-400">{t("upload_signed")}</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              <Calendar size={11} className="inline mr-1" />{t("label_contract_start")}
                            </label>
                            <input type="date" value={form.start_date}
                              onChange={e => patchForm(tender.tender_id, { start_date: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628]" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">
                              <Calendar size={11} className="inline mr-1" />{t("label_contract_end")}
                            </label>
                            <input type="date" value={form.end_date}
                              onChange={e => patchForm(tender.tender_id, { end_date: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A1628]" />
                          </div>
                        </div>

                        {/* Upload zone */}
                        <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                          form.signed_contract_url ? "border-green-400 bg-green-50"
                          : "border-slate-300 hover:border-[#0A1628]"
                        }`}>
                          {form.signed_contract_url ? (
                            <div className="text-green-700">
                              <CheckCircle2 size={24} className="mx-auto mb-2" />
                              <p className="text-xs font-black">{t("upload_success_label")}</p>
                              <a href={form.signed_contract_url} target="_blank" rel="noopener noreferrer"
                                className="text-[11px] text-green-600 hover:underline flex items-center justify-center gap-1 mt-1">
                                <ExternalLink size={10} /> {t("view_document")}
                              </a>
                            </div>
                          ) : form.uploading ? (
                            <div className="text-slate-400">
                              <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                              <p className="text-xs font-black">{t("uploading")}</p>
                            </div>
                          ) : (
                            <label className="cursor-pointer block">
                              <FileSignature size={24} className="text-slate-300 mx-auto mb-2" />
                              <p className="text-xs font-black text-slate-500">{t("upload_label")}</p>
                              <p className="text-[11px] text-slate-400 mt-1">{t("upload_hint")}</p>
                              <input type="file" className="hidden" accept=".pdf,.doc,.docx"
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(tender.tender_id, f); }} />
                            </label>
                          )}
                        </div>

                        {/* What happens next info */}
                        <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2 text-[11px] text-slate-500">
                          <Layers size={12} className="text-violet-500 mt-0.5 shrink-0" />
                          Confirming will mark this tender <strong className="mx-0.5">Contract Signed</strong>,
                          advance the linked project to <strong className="mx-0.5">Design Phase</strong>,
                          and create an entry in the Design Review module.
                        </div>

                        <button onClick={() => handleCreateContract(tender)}
                          disabled={processing === tender.tender_id || !form.signed_contract_url}
                          className="flex items-center gap-2 px-6 py-3 bg-[#0A1628] text-white text-sm font-black rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors">
                          {processing === tender.tender_id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <CheckCircle2 size={14} />}
                          {t("confirm_contract")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold text-white z-50 max-w-sm flex items-center gap-3 ${
          toast.type === "success" ? "bg-green-600" : "bg-red-500"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
          {toast.msg}
        </div>
      )}
    </div>
  );
}