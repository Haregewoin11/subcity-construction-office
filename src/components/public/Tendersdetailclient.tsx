"use client";
// src/components/public/TenderDetailClient.tsx
//
// ⚠️  Uses inline JSON hook — NOT next-intl or @/lib/useTranslations.
//    Both of those resolve on the server and do NOT re-render on client lang toggle.
//    Only a direct JSON import + useCallback([lang]) re-renders correctly.

import { useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { PublicNav, type SiteLang } from "@/components/public/Publicnav";
import {
  ArrowLeft, BarChart3, CalendarDays, MapPin, HardHat,
  ClipboardList, FileText, Globe, Upload, CheckCircle2,
  Clock, AlertTriangle, ChevronRight, Building2,
  Banknote, Paperclip, Send, X, Phone, Mail,
} from "lucide-react";
import { createClient } from "@/lib/actions/supabase/clients";

// ── Direct JSON imports (re-evaluated when lang state changes) ────────────────
import enMessages from "@/app/[locale]/en.json";
import amMessages from "@/app/[locale]/am.json";

// ── Types ─────────────────────────────────────────────────────────────────────
type AnyObj = Record<string, any>;

// ── Inline translation hook (re-renders on lang change) ───────────────────────
function useTranslation(lang: SiteLang) {
  const messages: AnyObj =
    lang === "am" ? (amMessages as AnyObj) : (enMessages as AnyObj);
  const t = useCallback(
    (path: string): string => {
      let node: unknown = messages;
      for (const p of path.split(".")) {
        if (node == null || typeof node !== "object") return path;
        node = (node as AnyObj)[p];
      }
      return typeof node === "string" ? node : path;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang]
  );
  return { t, isAm: lang === "am" };
}

type Tender = {
  tender_id: string; ref_no: string; title: string; description: string | null;
  project_type: string; woreda: string; budget_estimate: number; currency: string;
  status: string; submission_deadline: string; closing_date: string | null;
  publication_date: string | null; evaluation_method: string;
  min_experience_years: number; required_documents: string[] | null;
  document_url: string | null; visible_to_public: boolean;
};

type FormData = {
  company_name: string; tin_number: string; license_number: string;
  contact_person: string; contact_email: string; contact_phone: string;
  physical_address: string; years_of_experience: string;
  financial_offer: string; currency: string; project_timeline_days: string;
  technical_approach: string;
};

const EMPTY: FormData = {
  company_name: "", tin_number: "", license_number: "",
  contact_person: "", contact_email: "", contact_phone: "",
  physical_address: "", years_of_experience: "",
  financial_offer: "", currency: "ETB", project_timeline_days: "",
  technical_approach: "",
};



// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return n.toLocaleString();
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

const TYPE_COLORS: Record<string, string> = {
  School: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  Health: "bg-green-500/10 text-green-300 border-green-500/20",
  Youth:  "bg-violet-500/10 text-violet-300 border-violet-500/20",
  Road:   "bg-amber-500/10 text-amber-300 border-amber-500/20",
  Other:  "bg-slate-500/10 text-slate-300 border-slate-500/20",
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function TenderDetailClient({ locale, tender }: { locale: string; tender: Tender }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [lang, setLangState] = useState<SiteLang>(locale === "am" ? "am" : "en");
  const setLang = (newLang: SiteLang) => {
    setLangState(newLang);
    router.replace(pathname.replace(/^\/(en|am)/, `/${newLang}`));
  };
  const { t, isAm } = useTranslation(lang);    // ← inline hook, re-renders on lang change
  const amCls = isAm ? "amharic" : "";          // pass as am={amCls} to Section/Field props

  // supabase via useRef — created once, never recreated
  const supabase = useRef(createClient()).current;    // ← fixed: useRef pattern

  const deadline = new Date(tender.submission_deadline);
  const days     = Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);
  const isClosed = days < 0;
  const isUrgent = !isClosed && days <= 7;
  const docs     = Array.isArray(tender.required_documents) ? tender.required_documents : [];

  const [form,        setForm]        = useState<FormData>(EMPTY);
  const [errors,      setErrors]      = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [submittedRef,setSubmittedRef]= useState("");
  const [serverError, setServerError] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({
    technical_proposal: null, financial_proposal: null,
    company_profile: null, license_doc: null, tax_clearance: null,
  });

  function field(key: keyof FormData) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value })),
      className: `w-full bg-slate-50 border text-slate-800 placeholder-slate-300 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E85D1A]/40 focus:border-[#E85D1A]/40 focus:bg-white transition-all ${errors[key] ? "border-red-400" : "border-slate-200"} ${amCls}`,
    };
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    (["company_name","tin_number","license_number","contact_person",
      "contact_email","contact_phone","financial_offer"] as (keyof FormData)[])
      .forEach(k => { if (!form[k].trim()) e[k] = t("tenders.detail_required"); });
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email))
      e.contact_email = t("tenders.detail_required");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError("");
    try {
      const { data, error } = await supabase
        .from("bid_submissions")
        .insert({
          tender_id:             tender.tender_id,
          company_name:          form.company_name.trim(),
          tin_number:            form.tin_number.trim(),
          license_number:        form.license_number.trim(),
          contact_person:        form.contact_person.trim(),
          contact_email:         form.contact_email.trim(),
          contact_phone:         form.contact_phone.trim(),
          physical_address:      form.physical_address.trim() || null,
          years_of_experience:   form.years_of_experience ? parseInt(form.years_of_experience) : 0,
          financial_offer:       parseFloat(form.financial_offer.replace(/,/g, "")),
          currency:              form.currency,
          project_timeline_days: form.project_timeline_days ? parseInt(form.project_timeline_days) : null,
          technical_approach:    form.technical_approach.trim() || null,
        })
        .select("submission_ref")
        .single();
      if (error) throw error;
      setSubmittedRef(data.submission_ref);
      setSubmitted(true);
    } catch (err: any) {
      setServerError(err?.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (submitted) return (
    <div className="min-h-screen" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>
      <PublicNav locale={locale} lang={lang} onLangChange={setLang} />
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-8 pt-24">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h1 className={`text-2xl font-black text-white uppercase tracking-tight mb-3 ${amCls}`}>
            {t("tenders.detail_successTitle")}
          </h1>
          <p className={`text-white/40 text-sm mb-8 ${amCls}`}>{t("tenders.detail_successBody")}</p>
          <div className="bg-[#0D1F38] border border-[#E85D1A]/30 rounded-2xl p-6 mb-8">
            <p className={`text-white/40 text-xs font-bold uppercase tracking-wider mb-2 ${amCls}`}>
              {t("tenders.detail_successRef")}
            </p>
            <p className="text-[#E85D1A] text-2xl font-black font-mono tracking-widest">{submittedRef}</p>
          </div>
          <p className={`text-white/30 text-[11px] mb-8 leading-relaxed ${amCls}`}>
            {t("tenders.detail_successNote")}
          </p>
          <Link href={`/${lang}/tenders`}
            className={`inline-flex items-center gap-2 bg-[#E85D1A] hover:bg-orange-500 text-white px-6 py-3 font-black transition-colors ${isAm ? `${amCls} text-sm` : "text-xs uppercase tracking-wider"}`}>
            <ArrowLeft size={14} /> {t("tenders.detail_backToList")}
          </Link>
        </div>
      </div>
    </div>
  );

  // ── Main view ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>
      <PublicNav locale={locale} lang={lang} onLangChange={setLang} />

      {/* ════════════════════════════════════════════════════════════
          DARK HEADER — title, ref, countdown
      ════════════════════════════════════════════════════════════ */}
      <section className="bg-[#071220] border-b border-white/[0.06] pt-28 pb-12 px-8">
        <div className="max-w-5xl mx-auto">
          <Link href={`/${lang}/tenders`}
            className={`inline-flex items-center gap-2 text-white/30 hover:text-[#E85D1A] text-xs font-black uppercase tracking-wider transition-colors mb-8 ${amCls}`}>
            <ArrowLeft size={12} /> {t("tenders.detail_backToTenders")}
          </Link>

          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-4">
                <span className="text-[9px] font-black text-[#E85D1A] bg-[#E85D1A]/10 border border-[#E85D1A]/20 px-3 py-1.5 font-mono tracking-widest">
                  {tender.ref_no}
                </span>
                {tender.project_type && (
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wide ${TYPE_COLORS[tender.project_type] || TYPE_COLORS.Other}`}>
                    {tender.project_type}
                  </span>
                )}
                <span className="text-[9px] font-black px-2.5 py-1 text-emerald-400 bg-emerald-500/10 uppercase tracking-wide flex items-center gap-1">
                  <Globe size={9} /> {t("tenders.openLabel")}
                </span>
              </div>
              <h1 className={`font-black uppercase text-white leading-tight ${isAm ? `${amCls} text-2xl` : "text-3xl tracking-tight"}`}>
                {tender.title}
              </h1>
               {tender.description && (
              // <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <p className={`text-slate-600 text-sm leading-relaxed ${amCls}`}>{tender.description}</p>
              // </div>
            )}

            </div>

            {/* Countdown */}
            <div className={`rounded-2xl px-6 py-4 border text-center shrink-0 ${
              isClosed  ? "bg-white/[0.03] border-white/[0.06]"
              : isUrgent ? "bg-red-500/10 border-red-500/30"
              :             "bg-emerald-500/10 border-emerald-500/20"
            }`}>
              {isClosed ? (
                <>
                  <p className="text-white/30 text-2xl font-black">—</p>
                  <p className={`text-white/30 text-[10px] font-bold uppercase mt-1 ${amCls}`}>{t("tenders.detail_closedTitle")}</p>
                </>
              ) : (
                <>
                  {/* days count in JSX */}
                  <p className={`text-3xl font-black ${isUrgent ? "text-red-400" : "text-emerald-400"}`}>{days}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${isUrgent ? "text-red-400/70" : "text-emerald-400/70"} ${amCls}`}>
                    {t("tenders.daysLeft")}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          LIGHT BODY — sidebar + main content
      ════════════════════════════════════════════════════════════ */}
      <section className="bg-[#F8FAFC] py-12 px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── SIDEBAR ── */}
          <div className="lg:col-span-1 space-y-5">

            {/* Details card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <p className={`text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ${amCls}`}>
                {t("tenders.detail_tenderDetails")}
              </p>
              <DetailRow icon={<BarChart3 size={13}/>}     label={t("tenders.budget")}        value={`${fmt(Number(tender.budget_estimate))} ${tender.currency || "ETB"}`} isAm={isAm} />
              <DetailRow icon={<MapPin size={13}/>}        label={t("tenders.woreda")}        value={tender.woreda} isAm={isAm} />
              <DetailRow icon={<ClipboardList size={13}/>} label={t("tenders.evaluation")}    value={tender.evaluation_method} isAm={isAm} />
              {(tender.min_experience_years ?? 0) > 0 && (
                <DetailRow icon={<HardHat size={13}/>} label={t("tenders.minExperience")}
                  value={`${tender.min_experience_years} ${t("tenders.years")}`} isAm={isAm} />
              )}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <DetailRow icon={<CalendarDays size={13}/>} label={t("tenders.deadline")}
                  value={fmtDate(tender.submission_deadline)} isAm={isAm} urgent={isUrgent} />
                {tender.closing_date     && <DetailRow icon={<Clock size={13}/>}        label={t("tenders.closingDate")} value={fmtDate(tender.closing_date)}     isAm={isAm} />}
                {tender.publication_date && <DetailRow icon={<CheckCircle2 size={13}/>} label={t("tenders.published")}   value={fmtDate(tender.publication_date)} isAm={isAm} />}
              </div>
            </div>

            {/* Required docs */}
            {docs.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <p className={`text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ${amCls}`}>
                  {t("tenders.requiredDocs")}
                </p>
                <div className="space-y-2">
                  {docs.map(d => (
                    <div key={d} className="flex items-center gap-2">
                      <ChevronRight size={10} className="text-[#E85D1A] shrink-0" />
                      <span className={`text-[11px] text-slate-600 font-bold ${amCls}`}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Download button */}
            {tender.document_url && (
              <a href={tender.document_url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 w-full border border-[#E85D1A]/50 text-[#E85D1A] hover:bg-[#E85D1A]/5 py-3 px-4 rounded-xl font-black transition-all ${isAm ? `${amCls} text-[11px]` : "text-[10px] uppercase tracking-wider"}`}>
                <FileText size={14} /> {t("tenders.detail_downloadDoc")}
              </a>
            )}
          </div>

          {/* ── MAIN CONTENT ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Description */}
            {/* {tender.description && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <p className={`text-slate-600 text-sm leading-relaxed ${amCls}`}>{tender.description}</p>
              </div>
            )} */}

            {/* Closed notice */}
            {isClosed ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
                <X size={32} className="text-slate-300 mx-auto mb-3" />
                <h3 className={`text-slate-700 font-black uppercase text-lg mb-2 ${amCls}`}>
                  {t("tenders.detail_closedTitle")}
                </h3>
                <p className={`text-slate-400 text-sm ${amCls}`}>{t("tenders.detail_closedBody")}</p>
              </div>
            ) : (
              /* ══ BID SUBMISSION FORM ══════════════════════════════ */
              <form onSubmit={handleSubmit}>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                  {/* Form header — dark accent band */}
                  <div className="bg-[#0A1628] px-6 py-5">
                    <h2 className={`font-black text-white uppercase tracking-tight ${isAm ? `${amCls} text-base` : "text-lg"}`}>
                      {t("tenders.detail_submitBid")}
                    </h2>
                    <p className={`text-white/40 text-[11px] mt-1 ${amCls}`}>
                      {t("tenders.detail_submitBidSub")}
                    </p>
                  </div>

                  <div className="p-6 space-y-8">

                    {/* Company Info */}
                    <Section title={t("tenders.detail_companyInfo")} icon={<Building2 size={14}/>} am={amCls}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label={t("tenders.detail_companyName")}  required error={errors.company_name}   am={amCls}><input {...field("company_name")}      placeholder="e.g. Abebe Construction PLC" /></Field>
                        <Field label={t("tenders.detail_tinNumber")}    required error={errors.tin_number}     am={amCls}><input {...field("tin_number")}         placeholder="0000012345" /></Field>
                        <Field label={t("tenders.detail_licenseNumber")} required error={errors.license_number} am={amCls}><input {...field("license_number")}    placeholder="CON/GC/2024/00123" /></Field>
                        <Field label={t("tenders.detail_yearsExp")}             am={amCls}><input type="number" min="0" {...field("years_of_experience")} placeholder="5" /></Field>
                        <Field label={t("tenders.detail_contactPerson")} required error={errors.contact_person} am={amCls}><input {...field("contact_person")} placeholder="Full name" /></Field>
                        <Field label={t("tenders.detail_contactEmail")}  required error={errors.contact_email}  am={amCls}><input type="email" {...field("contact_email")} placeholder="company@email.com" /></Field>
                        <Field label={t("tenders.detail_contactPhone")}  required error={errors.contact_phone}  am={amCls}><input {...field("contact_phone")} placeholder="+251 9X XXX XXXX" /></Field>
                        <Field label={t("tenders.detail_physicalAddress")} am={amCls}><input {...field("physical_address")} placeholder="Addis Ababa…" /></Field>
                      </div>
                    </Section>

                    {/* Bid Details */}
                    <Section title={t("tenders.detail_bidDetails")} icon={<Banknote size={14}/>} am={amCls}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label={t("tenders.detail_financialOffer")} required error={errors.financial_offer} am={amCls}>
                          <input type="number" min="0" step="0.01" {...field("financial_offer")} placeholder="1500000" />
                        </Field>
                        <Field label={t("tenders.detail_currency")} am={amCls}>
                          <select {...field("currency")}>
                            {["ETB","USD","EUR"].map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </Field>
                        <Field label={t("tenders.detail_timeline")} am={amCls}>
                          <input type="number" min="1" {...field("project_timeline_days")} placeholder="180" />
                        </Field>
                      </div>
                      <div className="mt-4">
                        <Field label={t("tenders.detail_techApproach")} am={amCls}>
                          <textarea rows={5} {...field("technical_approach")}
                            placeholder={t("tenders.detail_techApproachPh")}
                            className={`w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-300 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E85D1A]/40 focus:bg-white transition-all resize-none ${amCls}`} />
                        </Field>
                      </div>
                    </Section>

                    {/* Documents */}
                    <Section title={t("tenders.detail_documents")} icon={<Paperclip size={14}/>} am={amCls}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {([
                          { key: "technical_proposal", labelKey: "tenders.detail_techProposal"    },
                          { key: "financial_proposal", labelKey: "tenders.detail_finProposal"     },
                          { key: "company_profile",    labelKey: "tenders.detail_companyProfile"  },
                          { key: "license_doc",        labelKey: "tenders.detail_licenseDoc"      },
                          { key: "tax_clearance",      labelKey: "tenders.detail_taxClearance"    },
                        ] as const).map(({ key, labelKey }) => (
                          <div key={key}>
                            <p className={`text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 ${amCls}`}>
                              {t(labelKey)}
                            </p>
                            <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl p-5 cursor-pointer hover:border-[#E85D1A]/50 hover:bg-[#E85D1A]/[0.02] transition-colors group">
                              {files[key] ? (
                                <>
                                  <CheckCircle2 size={18} className="text-emerald-500" />
                                  <span className="text-[10px] font-bold text-emerald-600 truncate max-w-full px-2">{files[key]!.name}</span>
                                </>
                              ) : (
                                <>
                                  <Upload size={18} className="text-slate-300 group-hover:text-[#E85D1A]/60 transition-colors" />
                                  <span className={`text-[10px] font-bold text-slate-400 text-center ${amCls}`}>{t("tenders.detail_uploadFile")}</span>
                                  <span className="text-[9px] text-slate-300">{t("tenders.detail_uploadHint")}</span>
                                </>
                              )}
                              <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                                onChange={e => setFiles(f => ({ ...f, [key]: e.target.files?.[0] ?? null }))} />
                            </label>
                          </div>
                        ))}
                      </div>
                    </Section>

                    {/* Server error */}
                    {serverError && (
                      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                        <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className={`text-red-600 font-black text-sm ${amCls}`}>{t("tenders.detail_errorTitle")}</p>
                          <p className="text-red-500/80 text-xs mt-1">{serverError}</p>
                        </div>
                      </div>
                    )}

                    {/* Submit button */}
                    <button type="submit" disabled={submitting}
                      className={`w-full flex items-center justify-center gap-2 bg-[#0A1628] hover:bg-[#E85D1A] disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-black transition-colors ${isAm ? `${amCls} text-sm` : "text-[11px] uppercase tracking-wider"}`}>
                      {submitting ? (
                        <>{t("tenders.detail_submitting")} <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /></>
                      ) : (
                        <>{t("tenders.detail_submitBtn")} <Send size={14} /></>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FOOTER BAND — dark
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-[#0A1628] border-t border-white/[0.06] py-8">
        <div className="max-w-5xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className={`text-white/30 text-[11px] ${amCls}`}>{t("common.officeTitle")}</p>
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

// ── Shared sub-components ──────────────────────────────────────────────────────
function DetailRow({ icon, label, value, isAm, urgent }: {
  icon: React.ReactNode; label: string; value: string; isAm: boolean; urgent?: boolean;
}) {
  const amCls = isAm ? "amharic" : "";
  return (
    <div className="flex items-start gap-3">
      <span className={`shrink-0 mt-0.5 ${urgent ? "text-red-400" : "text-[#E85D1A]/60"}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-[9px] font-black text-slate-400 uppercase tracking-wider ${amCls}`}>{label}</p>
        <p className={`text-[12px] font-bold ${urgent ? "text-red-500" : "text-slate-700"} ${amCls}`}>{value}</p>
      </div>
    </div>
  );
}

function Section({ title, icon, children, am }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; am: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <span className="text-[#E85D1A]/70">{icon}</span>
        <h3 className={`text-slate-800 font-black uppercase tracking-tight text-sm ${am}`}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, required, error, am }: {
  label: string; children: React.ReactNode; required?: boolean; error?: string; am: string;
}) {
  return (
    <div>
      <p className={`text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1 ${am}`}>
        {label}{required && <span className="text-[#E85D1A]">*</span>}
      </p>
      {children}
      {error && <p className={`text-red-500 text-[10px] font-bold mt-1 ${am}`}>{error}</p>}
    </div>
  );
}

// ── Global font styles ─────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800&family=Noto+Serif+Ethiopic:wght@400;600;700&display=swap');
  *, *::before, *::after { font-family: 'DM Sans', sans-serif; }
  .amharic { font-family: 'Noto Serif Ethiopic', serif !important; line-height: 1.75 !important; }
`;