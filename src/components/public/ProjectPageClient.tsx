// "use client";

// import { useState } from "react";
// import Link from "next/link";
// import { PublicNav, type SiteLang } from "@/components/public/Publicnav";
// import { useTranslations } from "@/lib/useTranslations";
// import {
//   Building2, BookOpen, Activity, Users,
//   Clock, MapPin, HardHat, Download, ArrowRight, CheckCircle2
// } from "lucide-react";

// function fmt(n: number) {
//   if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
//   if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + "M";
//   if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K";
//   return n.toLocaleString();
// }

// function ProjectPlaceholder({ sector }: { sector?: string }) {
//   const cfgs: Record<string, { bg: string; icon: React.ReactNode }> = {
//     Schools:   { bg: "from-blue-900 to-blue-700",    icon: <BookOpen size={28} className="text-white/40" /> },
//     Health:    { bg: "from-rose-900 to-rose-700",    icon: <Activity size={28} className="text-white/40" /> },
//     Youth:     { bg: "from-violet-900 to-violet-700",icon: <Users size={28} className="text-white/40" />    },
//     Libraries: { bg: "from-amber-900 to-amber-700",  icon: <BookOpen size={28} className="text-white/40" /> },
//   };
//   const cfg = cfgs[sector || ""] || { bg: "from-[#0D1F38] to-[#1B3A6B]", icon: <Building2 size={28} className="text-white/40" /> };
//   return (
//     <div className={`w-full h-44 bg-gradient-to-br ${cfg.bg} flex items-center justify-center relative overflow-hidden`}>
//       <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 1px,transparent 20px)" }} />
//       {cfg.icon}
//     </div>
//   );
// }

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// export function ProjectsPageClient({ locale, projects }: { locale: string; projects: any[] }) {
//   const [lang, setLang] = useState<SiteLang>("en");
//   const { t, tStatus, tSector } = useTranslations(lang);
//   const am = lang === "am" ? "amharic" : "";

//   const [search, setSearch] = useState("");
//   const [sectorF, setSectorF] = useState("all");
//   const [statusF, setStatusF] = useState("all");

//   const filtered = projects.filter(p => {
//     const q = search.toLowerCase();
//     const matchQ = !q || p.name?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q);
//     const matchSector = sectorF === "all" || p.sector === sectorF;
//     const matchStatus = statusF === "all" || p.status === statusF;
//     return matchQ && matchSector && matchStatus;
//   });

//   const total     = projects.length;
//   const ongoing   = projects.filter(p => p.status === "Ongoing").length;
//   const completed = projects.filter(p => p.status === "Completed").length;
//   const design    = projects.filter(p => p.status === "Design Phase").length;

//   return (
//     <div className="min-h-screen bg-[#F4F5F7]">
//       <PublicNav locale={locale} lang={lang} onLangChange={setLang} />

//       {/* Hero */}
//       <section className="bg-[#0A1628] pt-32 pb-16 relative overflow-hidden">
//         <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 60px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 60px)" }} />
//         <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[#E85D1A] via-[#E85D1A]/30 to-transparent" />
//         <div className="relative max-w-7xl mx-auto px-6">
//           <p className={`text-[10px] font-black uppercase tracking-[0.5em] text-[#E85D1A] mb-4 ${am}`}>{t("projects.eyebrow")}</p>
//           <h1 className={`text-6xl font-black text-white uppercase tracking-tight mb-4 ${am}`}>{t("projects.heroTitle")}</h1>
//           <p className={`text-white/40 text-lg max-w-xl leading-relaxed ${am}`}>{t("projects.heroBody")}</p>

//           <div className="flex flex-wrap gap-4 mt-10">
//             {[
//               { label: t("projects.filterAll"),      value: total,     color: "bg-white/8 border-white/10 text-white" },
//               { label: t("projects.filterOngoing"),  value: ongoing,   color: "bg-emerald-500/15 border-emerald-500/25 text-emerald-400" },
//               { label: t("projects.filterCompleted"),value: completed, color: "bg-blue-500/15 border-blue-500/25 text-blue-400" },
//               { label: t("projects.filterDesign"),   value: design,    color: "bg-amber-500/15 border-amber-500/25 text-amber-400" },
//             ].map(s => (
//               <div key={s.label} className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${s.color}`}>
//                 <span className="text-xl font-black">{s.value}</span>
//                 <span className={`text-[10px] font-black uppercase tracking-widest opacity-70 ${am}`}>{s.label}</span>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Filters */}
//       <div className="bg-white border-b border-slate-200 sticky top-[88px] z-30">
//         <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap gap-3 items-center">
//           <input
//             type="text" value={search} onChange={e => setSearch(e.target.value)}
//             placeholder={t("projects.searchPlaceholder")}
//             className={`flex-1 min-w-[200px] px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 transition-all ${am}`}
//           />
//           <select value={statusF} onChange={e => setStatusF(e.target.value)}
//             className={`px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-400 font-bold ${am}`}>
//             <option value="all">{t("projects.filterAll")}</option>
//             <option value="Ongoing">{t("projects.filterOngoing")}</option>
//             <option value="Completed">{t("projects.filterCompleted")}</option>
//             <option value="Design Phase">{t("projects.filterDesign")}</option>
//             <option value="BOQ Verification">{t("projects.filterBOQ")}</option>
//           </select>
//           <select value={sectorF} onChange={e => setSectorF(e.target.value)}
//             className={`px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-400 font-bold ${am}`}>
//             <option value="all">{t("projects.filterAll")}</option>
//             {["Schools","Health","Youth","Libraries"].map(s => (
//               <option key={s} value={s}>{tSector(s)}</option>
//             ))}
//           </select>
//           <p className={`text-[10px] text-slate-400 font-bold ml-auto ${am}`}>
//             {filtered.length} {t("projects.resultsLabel")}
//           </p>
//         </div>
//       </div>

//       {/* Grid */}
//       <div className="max-w-7xl mx-auto px-6 py-12">
//         {filtered.length === 0 ? (
//           <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center">
//             <Building2 size={32} className="text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
//             <p className={`text-slate-400 font-bold text-sm ${am}`}>{t("projects.noResults")}</p>
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {filtered.map((p: any) => {
//               const statusColor = p.status === "Ongoing" ? "bg-emerald-500 text-white" : p.status === "Completed" ? "bg-blue-500 text-white" : "bg-amber-500 text-white";
//               const days = p.expected_end_date ? Math.ceil((new Date(p.expected_end_date).getTime() - Date.now()) / 86400000) : null;
//               return (
//                 <div key={p.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:shadow-xl hover:border-[#E85D1A]/30 transition-all group flex flex-col">
//                   <div className="relative">
//                     <ProjectPlaceholder sector={p.sector} />
//                     <span className={`absolute top-3 left-3 text-[9px] font-black px-2.5 py-1 uppercase tracking-wider rounded-full ${statusColor}`}>
//                       {tStatus(p.status)}
//                     </span>
//                     {p.sector && (
//                       <span className="absolute top-3 right-3 text-[9px] font-black px-2.5 py-1 uppercase tracking-wider rounded-full bg-white/90 text-slate-700">
//                         {tSector(p.sector)}
//                       </span>
//                     )}
//                   </div>
//                   <div className="p-6 flex flex-col flex-1">
//                     <h3 className={`font-black text-slate-900 text-sm uppercase tracking-tight group-hover:text-[#E85D1A] transition-colors leading-snug mb-2 ${am}`}>{p.name}</h3>
//                     {p.location && (
//                       <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold mb-3">
//                         <MapPin size={10} />{p.location}
//                       </div>
//                     )}
//                     <div className="mt-auto">
//                       <div className="flex justify-between text-[10px] font-black text-slate-400 mb-1.5">
//                         <span className={`uppercase tracking-wider ${am}`}>{t("projects.progress")}</span>
//                         <span className="text-[#E85D1A]">{p.progress ?? 0}%</span>
//                       </div>
//                       <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
//                         <div className="h-full bg-[#E85D1A] rounded-full" style={{ width: `${p.progress ?? 0}%` }} />
//                       </div>
//                     </div>
//                     {p.contractor_name && (
//                       <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold mt-3">
//                         <HardHat size={10} /><span className="truncate">{p.contractor_name}</span>
//                       </div>
//                     )}
//                     <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
//                       {p.budget ? (
//                         <span className="text-[11px] text-slate-400 font-bold">
//                           <span className={am}>{t("projects.budget")} </span>
//                           <span className="text-slate-700">{fmt(Number(p.budget))} ETB</span>
//                         </span>
//                       ) : <span />}
//                       {days !== null && (
//                         <span className={`text-[9px] font-black px-2.5 py-1 rounded-full ${days < 0 ? "bg-red-100 text-red-600" : days <= 30 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
//                           {days < 0 ? `${Math.abs(days)}d ${t("projects.overdue")}` : `${days}d ${t("projects.left")}`}
//                         </span>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }