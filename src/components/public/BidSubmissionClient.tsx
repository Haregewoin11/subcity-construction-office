"use client";
// src/components/public/BidSubmissionClient.tsx
//
// Public bid submission — writes to bid_submissions table (not bids).
// No auth required. Contractor identifies via company_name + tin_number.

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { PublicNav } from "@/components/public/Publicnav";
import {
  Upload, ShieldCheck, Briefcase, FileText,
  Loader2, CheckCircle2, AlertTriangle, Globe,
  Phone, Mail, Clock,
} from "lucide-react";
import enMessages from "@/app/[locale]/en.json";
import amMessages from "@/app/[locale]/am.json";
import { createClient } from "@/lib/actions/supabase/clients";

// ── Types ──────────────────────────────────────────────────────────────────────
type SiteLang = "en" | "am";
type AnyObj   = Record<string, any>;

// ── Local translation hook ─────────────────────────────────────────────────────
function useTranslation(lang: SiteLang) {
  const messages: AnyObj =
    lang === "am" ? (amMessages as AnyObj) : (enMessages as AnyObj);
  const t = useCallback((path: string): string => {
    let node: unknown = messages;
    for (const p of path.split(".")) {
      if (node == null || typeof node !== "object") return path;
      node = (node as AnyObj)[p];
    }
    return typeof node === "string" ? node : path;
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  return { t, isAm: lang === "am" };
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const INP = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 focus:bg-white transition-all";

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}{required && <span className="text-[#E85D1A] ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

type FormData = {
  company_name: string;  tin_number: string;  license_number: string;
  contact_person: string; contact_email: string; contact_phone: string;
  physical_address: string; years_of_experience: string;
  financial_offer: string;
  technical_approach: string; project_timeline_days: string;
  technical_proposal_url: string;
  financial_proposal_url: string;
};

const EMPTY: FormData = {
  company_name: "", tin_number: "", license_number: "",
  contact_person: "", contact_email: "", contact_phone: "",
  physical_address: "", years_of_experience: "",
  financial_offer: "",
  technical_approach: "", project_timeline_days: "",
  technical_proposal_url: "",
  financial_proposal_url: "",
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function BidSubmissionClient({
  tenderId,
  locale,
}: {
  tenderId: string;
  locale: string;
}) {
  const [lang, setLang] = useState<SiteLang>(locale === "am" ? "am" : "en");
  const { t, isAm }     = useTranslation(lang);
  const am = isAm ? "amharic" : "";

  const supabase = useRef(createClient()).current;

  const [form,         setForm]         = useState<FormData>(EMPTY);
  const [loading,      setLoading]      = useState(false);
  const [uploadingTech,setUploadingTech]= useState(false);
  const [uploadingFin, setUploadingFin] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [submissionRef,setSubmissionRef]= useState<string | null>(null);

  const set = (key: keyof FormData, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  // ── File upload → Supabase Storage ─────────────────────────────────────────
  const uploadFile = async (file: File, type: "technical" | "financial") => {
    const isTech = type === "technical";
    isTech ? setUploadingTech(true) : setUploadingFin(true);
    setError(null);

    try {
      const ext      = file.name.split(".").pop();
      const fileName = `${Date.now()}_${type}.${ext}`;
      const path     = `bids/${tenderId}/${fileName}`;

      const { error: upErr } = await supabase.storage
        .from("procurement")
        .upload(path, file);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("procurement")
        .getPublicUrl(path);

      // Store URL in the CORRECT field — never overwrites financial_offer number
      set(isTech ? "technical_proposal_url" : "financial_proposal_url", urlData.publicUrl);
    } catch (e: any) {
      setError(t("tenders.bid_err_upload"));
    } finally {
      isTech ? setUploadingTech(false) : setUploadingFin(false);
    }
  };

  // ── Submit → bid_submissions table ─────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const required = ["company_name","tin_number","license_number",
                      "contact_person","contact_email","contact_phone","financial_offer"];
    const missing = required.filter(k => !(form as any)[k].trim());
    if (missing.length > 0 || !form.technical_proposal_url || !form.financial_proposal_url) {
      setError(t("tenders.bid_err_incomplete")); return;
    }
    if (isNaN(parseFloat(form.financial_offer))) {
      setError(t("tenders.bid_err_incomplete")); return;
    }

    setLoading(true);
    const { data, error: err } = await supabase
      .from("bid_submissions")               // ← correct table for public portal
      .insert({
        tender_id:              tenderId,
        company_name:           form.company_name.trim(),
        tin_number:             form.tin_number.trim(),
        license_number:         form.license_number.trim(),
        contact_person:         form.contact_person.trim(),
        contact_email:          form.contact_email.trim(),
        contact_phone:          form.contact_phone.trim(),
        physical_address:       form.physical_address.trim() || null,
        years_of_experience:    form.years_of_experience ? parseInt(form.years_of_experience) : 0,
        financial_offer:        parseFloat(form.financial_offer),
        technical_proposal_url: form.technical_proposal_url,
        financial_proposal_url: form.financial_proposal_url,
        technical_approach:     form.technical_approach.trim() || null,
        project_timeline_days:  form.project_timeline_days ? parseInt(form.project_timeline_days) : null,
        status:                 "Submitted",
      })
      .select("submission_ref")
      .single();

    setLoading(false);
    if (err) { setError(`${t("tenders.bid_err_submit")}: ${err.message}`); return; }
    setSubmissionRef(data?.submission_ref ?? null);
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (submissionRef) return (
    <div className="min-h-screen" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,700&family=Noto+Serif+Ethiopic:wght@400;700&display=swap');
        *, *::before, *::after { font-family: 'DM Sans', sans-serif; }
        .amharic { font-family: 'Noto Serif Ethiopic', serif !important; line-height: 1.75 !important; }
      `}</style>
      <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center gap-6 px-8">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
          <CheckCircle2 size={40} className="text-emerald-400" />
        </div>
        <h2 className={`font-black text-white text-3xl text-center ${am}`}>{t("tenders.bid_success_title")}</h2>
        <p className={`text-white/50 text-center ${am}`}>
          {t("tenders.bid_success_body")} <span className="text-[#E85D1A] font-black">{submissionRef}</span>
        </p>
        <Link href={`/${lang}/tenders`}
          className={`mt-4 px-8 py-4 bg-[#E85D1A] text-white rounded-xl font-black hover:bg-orange-500 transition-all ${am}`}>
          {t("tenders.view_all")}
        </Link>
      </div>
    </div>
  );

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800&family=Noto+Serif+Ethiopic:wght@400;600;700&display=swap');
        *, *::before, *::after { font-family: 'DM Sans', sans-serif; }
        .amharic { font-family: 'Noto Serif Ethiopic', serif !important; line-height: 1.75 !important; }
        .grid-texture {
          background-image:
            repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 60px),
            repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 60px);
          opacity: 0.03;
        }
      `}</style>

      {/* ══ UTILITY BAR ══ */}
      <div className="bg-[#071220] border-b border-white/[0.06] text-[11.5px] fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-8 h-8 flex items-center justify-between">
          <div className="hidden md:flex items-center gap-6 text-white/35">
            <a href={`tel:${t("util_bar.phone")}`} className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
              <Phone size={10} /> {t("util_bar.phone")}
            </a>
            <a href={`mailto:${t("util_bar.email")}`} className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
              <Mail size={10} /> {t("util_bar.email")}
            </a>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Globe size={10} className="text-white/20 mr-1" />
            <button onClick={() => setLang("en")}
              className={`px-3 py-0.5 text-[11px] font-black uppercase tracking-wider transition-all ${lang === "en" ? "text-white bg-[#E85D1A]" : "text-white/35 hover:text-white/70"}`}>
              EN
            </button>
            <span className="text-white/15">|</span>
            <button onClick={() => setLang("am")}
              className={`px-3 py-0.5 text-[11px] font-bold amharic transition-all ${lang === "am" ? "text-white bg-[#E85D1A]" : "text-white/35 hover:text-white/70"}`}>
              አማ
            </button>
          </div>
        </div>
      </div>

      {/* ══ PUBLIC NAV ══ */}
      <PublicNav locale={lang} />

      {/* ══ DARK HERO HEADER ══ */}
      <section className="relative bg-[#0A1628] pt-40 pb-14 overflow-hidden">
        <div className="absolute inset-0 grid-texture pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-8 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <p className={`text-[10px] font-black uppercase tracking-[0.5em] text-[#E85D1A] mb-3 ${am}`}>
              {t("tenders.eyebrow")}
            </p>
            <h1 className={`font-black text-white leading-tight ${isAm ? `${am} text-[32px]` : "text-[40px] md:text-[48px]"}`}>
              {t("tenders.bid_page_title")}
            </h1>
            <p className={`text-white/40 mt-2 ${isAm ? `${am} text-[13px]` : "text-sm"}`}>
              {t("tenders.bid_page_subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <ShieldCheck size={15} className="text-emerald-400" />
            <span className={`text-[10px] font-black text-emerald-400 uppercase tracking-widest ${am}`}>
              {t("tenders.bid_secure_label")}
            </span>
          </div>
        </div>
      </section>

      {/* ══ LIGHT FORM BODY ══ */}
      <section className="bg-[#F8FAFC] py-16">
        <div className="max-w-5xl mx-auto px-8">
          <form onSubmit={handleSubmit} className="space-y-10">

            {/* Warning banner */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className={`text-[13px] text-amber-700 leading-relaxed ${am}`}>
                {t("tenders.bid_warning")}
              </p>
            </div>

            {/* ── Company information ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-[#0A1628] rounded-xl flex items-center justify-center">
                  <Briefcase size={16} className="text-white" />
                </div>
                <h2 className={`font-black text-[#0A1628] text-lg ${am}`}>
                  {t("contractors_module.section_company")}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <F label={t("tenders.bid_field_company")} required>
                  <input type="text" className={INP} value={form.company_name}
                    onChange={e => set("company_name", e.target.value)} />
                </F>
                <F label={t("tenders.bid_field_tin")} required>
                  <input type="text" className={INP} value={form.tin_number}
                    onChange={e => set("tin_number", e.target.value)} />
                </F>
                <F label={t("tenders.bid_field_license")} required>
                  <input type="text" className={INP} value={form.license_number}
                    onChange={e => set("license_number", e.target.value)} />
                </F>
                <F label={t("tenders.bid_field_experience")}>
                  <input type="number" min={0} className={INP} value={form.years_of_experience}
                    onChange={e => set("years_of_experience", e.target.value)} />
                </F>
                <F label={t("tenders.bid_field_contact")} required>
                  <input type="text" className={INP} value={form.contact_person}
                    onChange={e => set("contact_person", e.target.value)} />
                </F>
                <F label={t("tenders.bid_field_email")} required>
                  <input type="email" className={INP} value={form.contact_email}
                    onChange={e => set("contact_email", e.target.value)} />
                </F>
                <F label={t("tenders.bid_field_phone")} required>
                  <input type="tel" className={INP} value={form.contact_phone}
                    onChange={e => set("contact_phone", e.target.value)} />
                </F>
                <F label={t("tenders.bid_field_address")}>
                  <input type="text" className={INP} value={form.physical_address}
                    onChange={e => set("physical_address", e.target.value)} />
                </F>
              </div>
            </div>

            {/* ── Financial offer ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <FileText size={16} className="text-white" />
                </div>
                <h2 className={`font-black text-[#0A1628] text-lg ${am}`}>
                  {t("tenders.bid_financial_section")}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <F label={t("tenders.bid_field_offer")} required>
                  <div className="relative">
                    <input type="number" min={0} step="0.01" className={INP + " pr-14"}
                      value={form.financial_offer}
                      onChange={e => set("financial_offer", e.target.value)} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">ETB</span>
                  </div>
                </F>
                <F label={t("tenders.bid_field_timeline")}>
                  <input type="number" min={1} className={INP}
                    value={form.project_timeline_days}
                    onChange={e => set("project_timeline_days", e.target.value)} />
                </F>
              </div>
              <div className="mt-5">
                <F label={t("tenders.bid_field_approach")}>
                  <textarea rows={3} className={INP + " resize-none"}
                    value={form.technical_approach}
                    onChange={e => set("technical_approach", e.target.value)} />
                </F>
              </div>
            </div>

            {/* ── Document uploads ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-[#E85D1A] rounded-xl flex items-center justify-center">
                  <Upload size={16} className="text-white" />
                </div>
                <h2 className={`font-black text-[#0A1628] text-lg ${am}`}>
                  {t("tenders.bid_docs_section")}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Technical proposal */}
                <div>
                  <input type="file" id="tech" accept=".pdf" className="hidden"
                    onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], "technical")} />
                  <label htmlFor="tech"
                    className={`flex items-center justify-between p-5 bg-slate-50 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      form.technical_proposal_url
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 hover:border-[#E85D1A]/50"
                    }`}>
                    <div className="flex items-center gap-3">
                      {uploadingTech
                        ? <Loader2 size={18} className="animate-spin text-slate-400" />
                        : form.technical_proposal_url
                          ? <CheckCircle2 size={18} className="text-emerald-500" />
                          : <Upload size={18} className="text-slate-400" />}
                      <div>
                        <p className={`text-[12px] font-black text-slate-700 ${am}`}>
                          {t("tenders.bid_field_technical")}
                          {form.technical_proposal_url && (
                            <span className="ml-2 text-emerald-600 text-[10px]">— {t("tenders.bid_staged")}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{t("tenders.bid_pdf_only")}</span>
                  </label>
                </div>

                {/* Financial proposal */}
                <div>
                  <input type="file" id="fin" accept=".pdf" className="hidden"
                    onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], "financial")} />
                  <label htmlFor="fin"
                    className={`flex items-center justify-between p-5 bg-slate-50 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      form.financial_proposal_url
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 hover:border-[#E85D1A]/50"
                    }`}>
                    <div className="flex items-center gap-3">
                      {uploadingFin
                        ? <Loader2 size={18} className="animate-spin text-slate-400" />
                        : form.financial_proposal_url
                          ? <CheckCircle2 size={18} className="text-emerald-500" />
                          : <Upload size={18} className="text-slate-400" />}
                      <div>
                        <p className={`text-[12px] font-black text-slate-700 ${am}`}>
                          {t("tenders.bid_field_financial_doc")}
                          {form.financial_proposal_url && (
                            <span className="ml-2 text-emerald-600 text-[10px]">— {t("tenders.bid_staged")}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{t("tenders.bid_pdf_only")}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-bold">
                <AlertTriangle size={15} /> {error}
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end">
              <button type="submit" disabled={loading || uploadingTech || uploadingFin}
                className={`flex items-center gap-3 px-10 py-4 bg-[#0A1628] text-white rounded-2xl font-black hover:bg-[#E85D1A] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isAm ? `${am} text-sm` : "text-[11px] uppercase tracking-widest"}`}>
                {loading
                  ? <><Loader2 size={15} className="animate-spin" /> {t("tenders.bid_btn_submitting")}</>
                  : t("tenders.bid_btn_submit")}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ══ FOOTER BAND ══ */}
      <div className="bg-[#0A1628] border-t border-white/[0.06] py-8">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className={`text-white/30 text-[11px] ${am}`}>{t("common.officeTitle")}</p>
          <div className="flex items-center gap-6 text-[11px] text-white/30">
            {(["", "/projects", "/tenders", "/services", "/about"] as const).map((path, i) => {
              const labels   = ["Home", "Projects", "Tenders", "Services", "About"];
              const amLabels = ["መነሻ", "ፕሮጀክቶች", "ጨረታዎች", "አገልግሎቶች", "ስለ እኛ"];
              return (
                <Link key={path} href={`/${lang}${path}`} className="hover:text-white/60 transition-colors">
                  {isAm ? amLabels[i] : labels[i]}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}