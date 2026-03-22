"use client";

// src/app/[locale]/HomePageClient.tsx
//
// This file lives in the SAME folder as en.json and am.json:
//   src/app/[locale]/en.json   ← your existing file
//   src/app/[locale]/am.json   ← your existing file
//   src/app/[locale]/HomePageClient.tsx  ← THIS file
//
// The relative imports below (`./en.json`, `./am.json`) work because
// all three files share the same directory.

import { useState, useCallback } from "react";
import Link from "next/link";
import { PublicNav } from "@/components/public/Publicnav";
import { useTranslations } from "@/lib/useTranslations";
import enMessages from "@/app/[locale]/en.json"
import amMessages from "@/app/[locale]/am.json";
import {
  ArrowRight, ChevronRight, Clock, FileText,
  Building2, AlertTriangle, Download, CheckCircle2,
  TrendingUp, MapPin, CalendarDays, ShieldCheck,
  Phone, Mail, HardHat, Users, Search,
  ClipboardList, BarChart3, BookOpen, ExternalLink,
  Globe, Eye, PieChart, Activity,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────
export type SiteLang = "en" | "am";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

// ─── arr() factory — shared hook only exposes t(); arr reads JSON arrays ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeArr(lang: SiteLang): (path: string) => any[] {
  const msgs: AnyObj = lang === "am" ? (amMessages as AnyObj) : (enMessages as AnyObj);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (path: string): any[] => {
    let node: unknown = msgs;
    for (const p of path.split(".")) {
      if (node == null || typeof node !== "object") return [];
      node = (node as AnyObj)[p];
    }
    return Array.isArray(node) ? node : [];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K";
  return n.toLocaleString();
}
function calcDaysLeft(d: string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

// ─── Static lookup tables ─────────────────────────────────────────────────
const SECTOR_STYLES: Record<
  string,
  { topBar: string; badge: string; progress: string; bar: string; color: string }
> = {
  Schools:   { topBar: "bg-[#1B3A6B]", badge: "bg-blue-100   text-blue-800",   progress: "bg-[#1B3A6B]", bar: "bg-blue-500",   color: "text-blue-400"   },
  Health:    { topBar: "bg-[#039737]", badge: "bg-green-100  text-green-800",  progress: "bg-[#039737]", bar: "bg-rose-500",   color: "text-rose-400"   },
  Youth:     { topBar: "bg-[#E85D1A]", badge: "bg-orange-100 text-orange-800", progress: "bg-[#E85D1A]", bar: "bg-violet-500", color: "text-violet-400" },
  Libraries: { topBar: "bg-[#7B5EA7]", badge: "bg-purple-100 text-purple-800", progress: "bg-[#7B5EA7]", bar: "bg-amber-500",  color: "text-amber-400"  },
};

const ANN_TAG_COLORS = [
  "bg-[#E85D1A]/10 text-[#E85D1A] border border-[#E85D1A]/20",
  "bg-blue-500/10  text-blue-400  border border-blue-500/20",
  "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
];

const PARTNER_COLORS = [
  "bg-blue-100   text-blue-800",
  "bg-green-100  text-green-800",
  "bg-purple-100 text-purple-800",
  "bg-amber-100  text-amber-800",
  "bg-rose-100   text-rose-800",
  "bg-cyan-100   text-cyan-800",
];
const PARTNER_SHORTS = ["ERA", "MUD", "AACA", "ECA", "AIB", "LEF"];
const NAV_HREFS      = ["/", "/projects", "/tenders", "/services", "/services", "/about"];

const SECTOR_DESC: Record<string, { en: string; am: string }> = {
  Schools:   { en: "Educational infrastructure for the next generation", am: "ለቀጣዩ ትውልድ የትምህርት መሠረተ ልማት" },
  Health:    { en: "Healthcare facilities serving every resident",        am: "ለእያንዳንዱ ነዋሪ የጤና አገልግሎት"      },
  Youth:     { en: "Youth centers and recreational spaces",              am: "የወጣቶች ማዕከሎችና የመዝናኛ ቦታዎች"     },
  Libraries: { en: "Community knowledge and learning hubs",              am: "የማህበረሰብ እውቀት ማዕከሎች"           },
};

// ─── Section Heading ──────────────────────────────────────────────────────
function SH({
  eyebrow, title, accent = "#E85D1A", dark = false, isAm,
}: {
  eyebrow: string; title: string; accent?: string; dark?: boolean; isAm?: boolean;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-1 h-6 shrink-0" style={{ backgroundColor: accent }} />
        <span
          className={`font-black ${isAm ? "amharic text-sm tracking-normal" : "text-[10px] uppercase tracking-[0.35em]"}`}
          style={{ color: accent }}
        >
          {eyebrow}
        </span>
      </div>
      <h2 className={`serif font-black leading-tight tracking-tight pl-[18px] ${dark ? "text-white" : "text-slate-900"} ${isAm ? "amharic text-[32px]" : "text-[40px]"}`}>
        {title}
      </h2>
    </div>
  );
}

// ─── Project image placeholder ────────────────────────────────────────────
function ProjectImagePlaceholder({ sector, label }: { sector?: string; label: string }) {
  const cfgs: Record<string, { bg: string; icon: JSX.Element }> = {
    Schools:   { bg: "from-blue-900  to-blue-700",    icon: <BookOpen size={30} className="text-white/40" /> },
    Health:    { bg: "from-rose-900  to-rose-700",    icon: <Activity size={30} className="text-white/40" /> },
    Youth:     { bg: "from-violet-900 to-violet-700", icon: <Users size={30} className="text-white/40" />    },
    Libraries: { bg: "from-amber-900 to-amber-700",   icon: <BookOpen size={30} className="text-white/40" /> },
  };
  const cfg = cfgs[sector || ""] || {
    bg: "from-[#0D1F38] to-[#1B3A6B]",
    icon: <Building2 size={30} className="text-white/40" />,
  };
  return (
    <div className={`w-full h-44 bg-gradient-to-br ${cfg.bg} flex flex-col items-center justify-center gap-2 relative overflow-hidden`}>
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 1px,transparent 20px)" }}
      />
      {cfg.icon}
      <span className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
    </div>
  );
}

// ─── Construction scene — professional nighttime city skyline ────────────
function ConstructionScene() {
  return (
    <div className="relative w-full overflow-hidden select-none" style={{ background: "#060D1A", height: 340 }} aria-hidden>
      <style>{`
        @keyframes cs-jib   { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-3deg)} }
        @keyframes cs-hook  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(7px)} }
        @keyframes cs-rise  { from{transform:scaleY(0);opacity:0} to{transform:scaleY(1);opacity:1} }
        @keyframes cs-blink { 0%,49%{opacity:1} 50%,100%{opacity:0.15} }
        @keyframes cs-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes cs-bar   { from{width:0} to{width:72%} }
        @keyframes cs-glow  { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes cs-scan  { 0%{transform:translateY(-4px);opacity:0} 15%{opacity:1} 85%{opacity:.8} 100%{transform:translateY(340px);opacity:0} }
        .cs-jib   { transform-origin: 390px 28px; animation: cs-jib  7s ease-in-out infinite; }
        .cs-hook  { animation: cs-hook  3.2s ease-in-out infinite; }
        .cs-r1    { transform-origin: bottom center; animation: cs-rise 1.1s cubic-bezier(.22,1,.36,1) .15s both; }
        .cs-r2    { transform-origin: bottom center; animation: cs-rise 1.1s cubic-bezier(.22,1,.36,1) .35s both; }
        .cs-r3    { transform-origin: bottom center; animation: cs-rise 1.1s cubic-bezier(.22,1,.36,1) .55s both; }
        .cs-r4    { transform-origin: bottom center; animation: cs-rise 1.1s cubic-bezier(.22,1,.36,1) .25s both; }
        .cs-r5    { transform-origin: bottom center; animation: cs-rise 1.1s cubic-bezier(.22,1,.36,1) .45s both; }
        .cs-blink { animation: cs-blink 1.4s step-end infinite; }
        .cs-float { animation: cs-float 4s ease-in-out infinite; }
        .cs-bar   { animation: cs-bar   2.8s ease-out .6s both; }
        .cs-glow  { animation: cs-glow  2s ease-in-out infinite; }
        .cs-scan  { animation: cs-scan  6s linear 1.2s infinite; }
      `}</style>
      <svg viewBox="0 0 520 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sky"    x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#060D1A"/>
            <stop offset="100%" stopColor="#0E2240"/>
          </linearGradient>
          <linearGradient id="blda"   x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#12253E"/>
            <stop offset="100%" stopColor="#1C3A60"/>
          </linearGradient>
          <linearGradient id="bldb"   x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0E1E32"/>
            <stop offset="100%" stopColor="#182E4A"/>
          </linearGradient>
          <linearGradient id="blduc"  x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0D1B2D"/>
            <stop offset="100%" stopColor="#162840"/>
          </linearGradient>
          <linearGradient id="gnd"    x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0A1828"/>
            <stop offset="100%" stopColor="#060D1A"/>
          </linearGradient>
          <linearGradient id="crane"  x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#B86A08"/>
            <stop offset="100%" stopColor="#E09020"/>
          </linearGradient>
          <radialGradient id="glowO"  cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#E85D1A" stopOpacity=".35"/>
            <stop offset="100%" stopColor="#E85D1A" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="glowG"  cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#039737" stopOpacity=".25"/>
            <stop offset="100%" stopColor="#039737" stopOpacity="0"/>
          </radialGradient>
          <filter id="soft"><feGaussianBlur stdDeviation="3"/></filter>
          <filter id="softer"><feGaussianBlur stdDeviation="6"/></filter>
        </defs>

        {/* Sky */}
        <rect width="520" height="340" fill="url(#sky)"/>

        {/* Stars */}
        {[[18,12],[55,8],[100,18],[160,6],[230,14],[310,9],[380,16],[450,11],[500,20],
          [40,30],[140,28],[260,22],[420,26],[480,32]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r={i%3===0?1.1:.7} fill="white" opacity={.2+i%4*.1}/>
        ))}

        {/* Ambient city glow on horizon */}
        <ellipse cx="260" cy="295" rx="240" ry="55" fill="url(#glowO)" filter="url(#softer)" opacity=".7"/>

        {/* ═══ BACKGROUND BUILDINGS (silhouette layer) ═══════════════ */}

        {/* Far-left slim tower */}
        <g className="cs-r1">
          <rect x="5"  y="110" width="32" height="220" fill="#0B1828" opacity=".9"/>
          <rect x="5"  y="108" width="32" height="4"   fill="#142438"/>
          {[[9,120],[21,120],[9,138],[21,138],[9,156],[21,156],[9,174],[21,174]].map(([wx,wy],i)=>(
            <rect key={i} x={wx} y={wy} width="7" height="11" fill="#2A5080" opacity={.15+(i%3)*.12} rx=".5"/>
          ))}
        </g>

        {/* Mid-left civic block */}
        <g className="cs-r2">
          <rect x="42"  y="135" width="58" height="195" fill="url(#bldb)" opacity=".85"/>
          <rect x="52"  y="112" width="38" height="25"  fill="#102030" opacity=".9"/>
          <rect x="60"  y="100" width="22" height="14"  fill="#0C1A28"/>
          <rect x="69"  y="92"  width="5"  height="10"  fill="#1A3050"/>
          {Array.from({length:4},(_,r)=>Array.from({length:4},(_,c)=>(
            <rect key={`${r}-${c}`} x={47+c*13} y={145+r*20} width="9" height="13"
              fill="#3A78B0" opacity={.12+(r+c)%3*.1} rx=".5"/>
          ))).flat()}
        </g>

        {/* Right-side background block */}
        <g className="cs-r4">
          <rect x="458" y="155" width="62" height="175" fill="url(#bldb)" opacity=".75"/>
          {Array.from({length:3},(_,r)=>Array.from({length:4},(_,c)=>(
            <rect key={`${r}-${c}`} x={463+c*13} y={163+r*22} width="9" height="14"
              fill="#2E68A0" opacity={.1+(c%2)*.12} rx=".5"/>
          ))).flat()}
        </g>

        {/* ═══ MAIN LEFT BUILDING — completed civic tower ══════════ */}
        <g className="cs-r3">
          {/* Core */}
          <rect x="100" y="78"  width="128" height="252" fill="url(#blda)"/>
          {/* Pilasters */}
          <rect x="100" y="78"  width="5"   height="252" fill="#1E406A" opacity=".6"/>
          <rect x="223" y="78"  width="5"   height="252" fill="#122030" opacity=".5"/>
          <rect x="148" y="78"  width="5"   height="252" fill="#1A3858" opacity=".35"/>
          {/* Cornice */}
          <rect x="98"  y="76"  width="132" height="7"   fill="#245080"/>
          <rect x="98"  y="81"  width="132" height="2"   fill="rgba(255,255,255,.06)"/>
          {/* Crown / stepped rooftop */}
          <rect x="115" y="58"  width="98"  height="22"  fill="#1A3A5E"/>
          <rect x="132" y="44"  width="64"  height="16"  fill="#142E4A"/>
          <rect x="150" y="34"  width="28"  height="12"  fill="#0E2035"/>
          <rect x="162" y="26"  width="5"   height="10"  fill="#1E4070"/>
          {/* Flagpole light */}
          <circle cx="164" cy="25" r="3" fill="#E85D1A" className="cs-blink cs-glow"/>
          {/* Windows — warm blue */}
          {Array.from({length:9},(_,r)=>Array.from({length:4},(_,c)=>(
            <rect key={`${r}-${c}`}
              x={109+c*28} y={88+r*22} width="18" height="15"
              fill={r<4?"#4898C8":"#5AACDC"}
              opacity={.18+(r*c)%4*.12} rx="1"/>
          ))).flat()}
          {/* Lit windows (random warm-yellow, "occupied") */}
          {[[109,88],[165,110],[137,154],[193,176],[109,198]].map(([wx,wy],i)=>(
            <rect key={i} x={wx} y={wy} width="18" height="15" fill="#E8C060" opacity=".55" rx="1"/>
          ))}
          {/* Ground floor lobby */}
          <rect x="100" y="295" width="128" height="35" fill="#0E1E30"/>
          <rect x="134" y="297" width="60"  height="30" fill="#162840" opacity=".9"/>
          {/* Entry steps */}
          <rect x="130" y="328" width="68" height="4" fill="#1A3050"/>
          <rect x="136" y="324" width="56" height="4" fill="#142840"/>
        </g>

        {/* ═══ MAIN RIGHT BUILDING — under construction ══════════ */}
        <g>
          {/* Completed base floors */}
          <g className="cs-r5">
            <rect x="258" y="190" width="138" height="140" fill="url(#blduc)"/>
            {Array.from({length:4},(_,r)=>Array.from({length:5},(_,c)=>(
              <rect key={`${r}-${c}`}
                x={265+c*24} y={198+r*22} width="15" height="14"
                fill="#2E68A0" opacity={.14+r%2*.12} rx="1"/>
            ))).flat()}
            {/* Floor slab edges */}
            {[190,212,234,256,278,300].map((y,i)=>(
              <rect key={i} x="258" y={y} width="138" height="2" fill="rgba(255,255,255,.04)"/>
            ))}
          </g>

          {/* Exposed upper skeleton — raw concrete */}
          <rect x="258" y="158" width="138" height="34" fill="#0E1C2E" opacity=".92"/>
          <rect x="258" y="126" width="138" height="34" fill="#0C192A" opacity=".9"/>
          <rect x="258" y="95"  width="138" height="33" fill="#0A1626" opacity=".88"/>
          <rect x="258" y="65"  width="138" height="32" fill="#08121E" opacity=".85"/>

          {/* Slab edges on raw floors */}
          {[158,126,95,65].map((y,i)=>(
            <rect key={i} x="258" y={y} width="138" height="2" fill="rgba(232,93,26,.18)"/>
          ))}

          {/* Scaffold — orange steel */}
          {[260,286,312,338,364,390].map((x,i)=>(
            <rect key={i} x={x} y="62" width="3" height="270" fill="#E85D1A" opacity=".4"/>
          ))}
          {[62,88,115,142,158,190,220].map((y,i)=>(
            <rect key={i} x="260" y={y} width="133" height="2" fill="#E85D1A" opacity=".28"/>
          ))}
          {/* Cross-bracing */}
          <line x1="260" y1="62"  x2="390" y2="158" stroke="#E85D1A" strokeWidth="1.5" opacity=".12"/>
          <line x1="390" y1="62"  x2="260" y2="158" stroke="#E85D1A" strokeWidth="1.5" opacity=".12"/>
          <line x1="260" y1="115" x2="390" y2="190" stroke="#E85D1A" strokeWidth="1"   opacity=".09"/>

          {/* Rebar sticking up */}
          {[268,278,290,302,314,326,340,352,366,378].map((x,i)=>(
            <line key={i} x1={x} y1="65" x2={x+(i%3-1)*3} y2="46"
              stroke="#C05A10" strokeWidth="1.8" opacity=".55"/>
          ))}

          {/* Scaffold work-lights */}
          <ellipse cx="260" cy="62" rx="8" ry="6" fill="#FFB020" filter="url(#soft)" className="cs-glow"/>
          <circle  cx="260" cy="62" r="2.5" fill="#FFE080" className="cs-blink"/>
          <ellipse cx="390" cy="62" rx="8" ry="6" fill="#FFB020" filter="url(#soft)" className="cs-glow"/>
          <circle  cx="390" cy="62" r="2.5" fill="#FFE080" className="cs-blink"/>
          <ellipse cx="325" cy="88" rx="6" ry="5" fill="#FFB020" filter="url(#soft)" className="cs-glow"/>
        </g>

        {/* ═══ TOWER CRANE ════════════════════════════════════════ */}
        {/* Mast */}
        <rect x="388" y="20" width="7" height="310" fill="url(#crane)"/>
        <rect x="386" y="20" width="2" height="310" fill="rgba(255,255,255,.08)"/>
        {/* Ladder rungs */}
        {Array.from({length:20},(_,i)=>(
          <rect key={i} x="388" y={24+i*15} width="7" height="1.5" fill="#C07010" opacity=".4"/>
        ))}
        {/* Counter-jib */}
        <rect x="342" y="20" width="48" height="7" fill="#CC8A10"/>
        <rect x="330" y="16" width="20" height="6" fill="#AA7010"/>
        {/* Counterweight block */}
        <rect x="326" y="22" width="22" height="16" fill="#806008" rx="1"/>
        {/* Main jib — animated */}
        <g className="cs-jib">
          <rect x="393" y="18" width="110" height="7" fill="url(#crane)"/>
          {/* Tie rods */}
          <line x1="395" y1="20" x2="430" y2="38" stroke="#B87010" strokeWidth="2" opacity=".7"/>
          <line x1="430" y1="20" x2="460" y2="36" stroke="#B87010" strokeWidth="2" opacity=".7"/>
          <line x1="460" y1="20" x2="500" y2="30" stroke="#B87010" strokeWidth="1.5" opacity=".6"/>
          {/* Trolley */}
          <rect x="458" y="23" width="16" height="9" fill="#C07010" rx="1"/>
          {/* Hook cable + load */}
          <g className="cs-hook">
            <line x1="466" y1="32" x2="466" y2="72" stroke="#806040" strokeWidth="1.5"/>
            <rect x="460" y="72" width="12" height="7" fill="#5A4030" rx="1"/>
            {/* Concrete panel being hoisted */}
            <rect x="446" y="79" width="40" height="22" fill="#243A56" rx="1"/>
            <line x1="446" y1="87" x2="486" y2="87" stroke="rgba(255,255,255,.07)" strokeWidth="1"/>
            <rect x="458" y="81" width="12" height="5" fill="#1A2E44" opacity=".8"/>
          </g>
        </g>
        {/* Operator cab */}
        <rect x="387" y="24" width="14" height="11" fill="#9A6A0A" rx="1"/>
        <rect x="389" y="26" width="5"  height="6"  fill="rgba(255,255,255,.18)" rx=".5"/>

        {/* ═══ GROUND ════════════════════════════════════════════ */}
        <rect x="0" y="308" width="520" height="32" fill="url(#gnd)"/>
        <rect x="0" y="307" width="520" height="2"  fill="#0E1E30" opacity=".8"/>

        {/* Safety hoarding — orange & white panels */}
        {Array.from({length:17},(_,i)=>(
          <g key={i} transform={`translate(${i*30+2},288)`}>
            <rect x="0"  y="0" width="28" height="20" fill={i%2===0?"#E85D1A":"#1A3050"} opacity={i%2===0?.7:.5}/>
            <rect x="0"  y="8" width="28" height="2"  fill="white" opacity=".18"/>
            <rect x="0"  y="0" width="2"  height="20" fill="rgba(255,255,255,.1)"/>
            <rect x="26" y="0" width="2"  height="20" fill="rgba(0,0,0,.2)"/>
          </g>
        ))}

        {/* Ground glow under the scene */}
        <ellipse cx="300" cy="318" rx="120" ry="14" fill="url(#glowO)" opacity=".55"/>

        {/* ═══ FLOATING UI OVERLAYS ══════════════════════════════ */}

        {/* Progress card — floats left */}
        <g transform="translate(16,16)" className="cs-float">
          <rect width="136" height="54" rx="3" fill="#060D1A" opacity=".97"
            stroke="#E85D1A" strokeWidth=".8" strokeOpacity=".5"/>
          {/* Left accent stripe */}
          <rect x="0" y="0" width="3" height="54" rx="1" fill="#E85D1A"/>
          <text x="12" y="14" fontSize="7" fill="#E85D1A" fontWeight="800"
            fontFamily="sans-serif" letterSpacing="1.2">SITE PROGRESS</text>
          {/* Track */}
          <rect x="12" y="21" width="96" height="5" rx="2.5" fill="rgba(255,255,255,.07)"/>
          {/* Animated fill */}
          <rect x="12" y="21" width="0"  height="5" rx="2.5" fill="#E85D1A" className="cs-bar"/>
          <text x="114" y="27" fontSize="8" fill="white" fontWeight="900" fontFamily="sans-serif">72%</text>
          {/* Sub-label */}
          <text x="12" y="40" fontSize="6.5" fill="rgba(255,255,255,.3)" fontFamily="sans-serif">Block C · Floor 9 of 14</text>
          {/* Dot */}
          <circle cx="12" cy="49" r="2.5" fill="#039737" className="cs-blink"/>
          <text x="19" y="52" fontSize="6" fill="rgba(255,255,255,.25)" fontFamily="sans-serif">Live data</text>
        </g>

        {/* LIVE badge */}
        <g transform="translate(360,16)">
          <rect width="90" height="22" rx="11" fill="#E85D1A"/>
          <circle cx="16" cy="11" r="4" fill="white" className="cs-blink"/>
          <text x="26" y="15.5" fontSize="8" fill="white" fontWeight="800"
            fontFamily="sans-serif" letterSpacing=".5">LIVE SITE</text>
        </g>

        {/* Workers on site badge */}
        <g transform="translate(360,44)">
          <rect width="90" height="21" rx="3" fill="#039737" opacity=".9"/>
          <text x="10" y="14.5" fontSize="8" fill="white" fontWeight="700" fontFamily="sans-serif">
            👷 24 Workers
          </text>
        </g>

        {/* Scan line */}
        <rect x="0" y="0" width="520" height="1.5" fill="rgba(232,93,26,.35)" className="cs-scan"/>
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════
export function HomePageClient({
  locale,
  projects,
  tenders,
  contractors,
}: {
  locale: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projects: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tenders: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contractors: any[];
}) {
  const [lang, setLang] = useState<SiteLang>("en");
  const { t, isAm } = useTranslations(lang);  // shared hook — correct closure deps
  const arr = makeArr(lang);                    // arr() for JSON array paths
  const am = isAm ? "amharic" : "";

  // ── Data derivations ──
  const projs          = projects     ?? [];
  const allTenders     = tenders      ?? [];
  const allContractors = contractors  ?? [];
  const totalBudget    = projs.reduce((s: number, p: any) => s + Number(p.budget || 0), 0);
  const ongoing        = projs.filter((p: any) => p.status === "Ongoing");
  const completed      = projs.filter((p: any) => p.status === "Completed");
  const openTenders    = allTenders.filter((tn: any) => tn.status === "Published");
  const featured       = [...ongoing, ...projs.filter((p: any) => p.status !== "Ongoing")].slice(0, 6);

  const sectorMap: Record<string, { count: number; completed: number }> = {};
  projs.forEach((p: any) => {
    if (!p.sector) return;
    if (!sectorMap[p.sector]) sectorMap[p.sector] = { count: 0, completed: 0 };
    sectorMap[p.sector].count++;
    if (p.status === "Completed") sectorMap[p.sector].completed++;
  });

  const sectorLabel = (sector?: string) => {
    const map: Record<string, string> = {
      Schools:   t("common.education_label"),
      Health:    t("common.health_label"),
      Youth:     t("common.youth_label"),
      Libraries: t("common.library_label"),
    };
    return sector ? (map[sector] ?? t("common.infra_label")) : t("common.infra_label");
  };

  return (
    <div className="min-h-screen">
      {/* ── Global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Serif+Display:ital@0;1&family=Noto+Serif+Ethiopic:wght@400;600;700&display=swap');
        *, *::before, *::after { font-family: 'DM Sans', sans-serif; }
        .serif   { font-family: 'DM Serif Display', Georgia, serif !important; }
        .amharic { font-family: 'Noto Serif Ethiopic', serif !important; line-height: 1.75 !important; }
        html { scroll-behavior: smooth; }

        .card-dark {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          transition: border-color .2s, background .2s, transform .2s, box-shadow .2s;
        }
        .card-dark:hover {
          border-color: rgba(232,93,26,0.45);
          background: rgba(255,255,255,0.06);
          transform: translateY(-2px);
          box-shadow: 0 16px 40px rgba(0,0,0,.3);
        }
        .card-light {
          background: #fff;
          border: 1px solid #e2e8f0;
          transition: box-shadow .2s, border-color .2s, transform .2s;
        }
        .card-light:hover {
          box-shadow: 0 12px 32px rgba(10,22,40,.12);
          border-color: rgba(232,93,26,.30);
          transform: translateY(-2px);
        }
        /* ── Hero architectural background ── */
        .hero-bg {
          background-color: #060E1C;
        }
        /* Fine engineering grid */
        .hero-grid {
          background-image:
            linear-gradient(rgba(232,93,26,.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(232,93,26,.06) 1px, transparent 1px),
            linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px);
          background-size: 80px 80px, 80px 80px, 16px 16px, 16px 16px;
        }
        /* Diagonal structural hatching */
        .hero-hatch::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: repeating-linear-gradient(
            -45deg,
            transparent 0, transparent 48px,
            rgba(232,93,26,.025) 48px, rgba(232,93,26,.025) 49px
          );
          pointer-events: none;
        }
        /* Depth glow layers */
        .hero-depth::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 100% at 28% 55%, rgba(6,14,28,.0) 0%, rgba(6,14,28,.65) 100%),
            radial-gradient(ellipse 60% 70% at 80% 40%, rgba(232,93,26,.09) 0%, transparent 65%),
            radial-gradient(ellipse 40% 55% at 10% 85%, rgba(3,151,55,.06) 0%, transparent 55%);
          pointer-events: none;
        }
        /* Blueprint corner brackets */
        .h-corner {
          position: absolute;
          width: 22px; height: 22px;
          pointer-events: none;
        }
        .h-corner-tl { top: 104px; left: 18px;  border-top: 1.5px solid rgba(232,93,26,.45); border-left: 1.5px solid rgba(232,93,26,.45); }
        .h-corner-tr { top: 104px; right: 18px;  border-top: 1.5px solid rgba(232,93,26,.45); border-right: 1.5px solid rgba(232,93,26,.45); }
        .h-corner-bl { bottom: 4px; left: 18px;  border-bottom: 1.5px solid rgba(232,93,26,.3); border-left: 1.5px solid rgba(232,93,26,.3); }
        .h-corner-br { bottom: 4px; right: 18px; border-bottom: 1.5px solid rgba(232,93,26,.3); border-right: 1.5px solid rgba(232,93,26,.3); }
        /* Animated monitor scan line */
        @keyframes hero-scan {
          0%   { transform: translateY(0);     opacity: 0; }
          8%   { opacity: .7; }
          92%  { opacity: .5; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .hero-scan {
          position: absolute;
          left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(232,93,26,.5) 30%, rgba(232,93,26,.7) 50%, rgba(232,93,26,.5) 70%, transparent 100%);
          animation: hero-scan 9s linear 0.5s infinite;
          pointer-events: none;
          top: 0;
        }
        /* Ruler tick strip at very bottom of hero */
        .hero-ruler {
          position: absolute;
          bottom: 0; left: 0; right: 0; height: 20px;
          background-image:
            repeating-linear-gradient(90deg, rgba(232,93,26,.3) 0, rgba(232,93,26,.3) 1px, transparent 1px, transparent 40px),
            repeating-linear-gradient(90deg, rgba(232,93,26,.12) 0, rgba(232,93,26,.12) 1px, transparent 1px, transparent 8px);
          pointer-events: none;
        }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.35} }
        .pulse { animation: pulse-dot 2s ease-in-out infinite; }
        @keyframes mapPinPop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.3)} }
        .map-pin-pulse { animation: mapPinPop 2s ease-in-out infinite; }
      `}</style>

      {/* ══════════════════════════════════════════
          TOP UTILITY BAR — language toggle lives here
      ══════════════════════════════════════════ */}
      <div className="bg-[#071220] border-b border-white/[0.06] text-[11.5px] fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-8 h-8 flex items-center justify-between">
          {/* Contact info */}
          <div className="hidden md:flex items-center gap-6 text-white/35">
            <a href={`tel:${t("util_bar.phone")}`} className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
              <Phone size={10} /> {t("util_bar.phone")}
            </a>
            <a href={`mailto:${t("util_bar.email")}`} className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
              <Mail size={10} /> {t("util_bar.email")}
            </a>
            <span className={`flex items-center gap-1.5 ${am}`}>
              <Clock size={10} className="text-[#E85D1A] shrink-0" /> {t("util_bar.hours")}
            </span>
          </div>

          {/* ── Language toggle ── */}
          <div className="flex items-center gap-1 ml-auto">
            <Globe size={10} className="text-white/20 mr-1" />
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-0.5 text-[11px] font-black uppercase tracking-wider transition-all ${
                lang === "en"
                  ? "text-white bg-[#E85D1A]"
                  : "text-white/35 hover:text-white/70"
              }`}
            >
              EN
            </button>
            <span className="text-white/15">|</span>
            <button
              onClick={() => setLang("am")}
              className={`px-3 py-0.5 text-[11px] font-bold amharic transition-all ${
                lang === "am"
                  ? "text-white bg-[#E85D1A]"
                  : "text-white/35 hover:text-white/70"
              }`}
            >
              አማ
            </button>
          </div>
        </div>
      </div>

      {/* PublicNav — lang + onLangChange keeps nav toggle in sync with page */}
      <PublicNav locale={locale} lang={lang} onLangChange={setLang} />

      {/* ══════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════ */}
      <section className="hero-bg hero-grid hero-hatch hero-depth relative min-h-screen flex items-center overflow-hidden pt-32">

        {/* Architectural corner brackets */}
        {/* <div className="h-corner h-corner-tl" />
        <div className="h-corner h-corner-tr" />
        <div className="h-corner h-corner-bl" />
        <div className="h-corner h-corner-br" /> */}

        {/* Live monitor scan line */}
        {/* <div className="hero-scan" /> */}

        {/* Ruler strip at bottom */}
        {/* <div className="hero-ruler" /> */}

        {/* Left structural accent pillar */}
        {/* <div className="absolute left-0 top-0 bottom-0 w-[3px] pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent 5%, #E85D1A 30%, #E85D1A 70%, transparent 95%)" }} /> */}

        {/* Bottom separator line */}
        {/* <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none"
          style={{ background: "linear-gradient(90deg, #E85D1A 0%, rgba(232,93,26,.35) 45%, transparent 100%)" }} /> */}

        {/* Blueprint compass rings — decorative, right side */}
        {/* <div className="absolute pointer-events-none" style={{ right: -100, top: "50%", transform: "translateY(-50%)" }} aria-hidden>
          {[440, 330, 220, 130].map((size, i) => (
            <div key={i} className="absolute rounded-full"
              style={{
                width: size, height: size,
                top: "50%", left: "50%",
                transform: "translate(-50%,-50%)",
                border: `1px solid rgba(232,93,26,${.03 + i*.022})`,
              }} />
          ))}
        </div> */}

        {/* Zone label — technical drawing metadata */}
      

        <div className="relative max-w-7xl mx-auto px-8 py-24 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

            {/* Left: headline */}
            <div className="lg:col-span-7">
              {/* <div className="inline-flex items-center gap-2.5 border border-[#E85D1A]/35 bg-[#E85D1A]/8 px-4 py-2 mb-8">
                <div className="w-2 h-2 rounded-full bg-[#E85D1A] pulse" />
                <span className={`text-[#E85D1A] font-black ${isAm ? `${am} text-sm` : "text-[10px] uppercase tracking-[0.22em]"}`}>
                  {t("hero.badge")}
                </span>
              </div> */}

              <h1 className={`serif text-white leading-[1.02] tracking-tight mb-4 ${isAm ? `${am} text-[52px] md:text-[64px]` : "text-[64px] md:text-[80px]"}`}>
                {t("hero.headline_1")}<br />
                <em className="not-italic text-[#039737]">{t("hero.headline_accent")}</em>
                {" "}{t("hero.headline_2")}
              </h1>

              <p className={`text-white/45 leading-[1.85] mb-10 max-w-[540px] ${isAm ? `${am} text-[15px]` : "text-[17px]"}`}>
                {t("hero.subtext")}
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href={`/${locale}/projects`}
                  className={`inline-flex items-center gap-2.5 bg-[#E85D1A] hover:bg-orange-500 text-white px-8 py-4 font-black transition-colors shadow-2xl shadow-orange-900/30 ${isAm ? `${am} text-sm` : "text-[12px] uppercase tracking-[0.18em]"}`}>
                  <Building2 size={14} strokeWidth={2.5} /> {t("hero.cta_projects")}
                </Link>
                <Link href={`/${locale}/tenders`}
                  className={`inline-flex items-center gap-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/15 hover:border-white/30 px-8 py-4 font-black transition-all ${isAm ? `${am} text-sm` : "text-[12px] uppercase tracking-[0.18em]"}`}>
                  <FileText size={14} strokeWidth={2.5} /> {t("hero.cta_tenders")}
                </Link>
              </div>
            </div>

            {/* Right: animated scene card */}
            <div className="lg:col-span-5">
              <div className="card-dark overflow-hidden" style={{ boxShadow: "0 4px 40px rgba(0,0,0,.4)" }}>
                <div className="bg-[#E85D1A]/12 border-b border-white/8 px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className={`text-white/25 font-black mb-0.5 ${isAm ? `${am} text-xs` : "text-[9px] uppercase tracking-[0.25em]"}`}>
                      {t("hero.scene_label")}
                    </p>
                    <p className={`text-white font-bold text-[13px] ${am}`}>
                      {t("footer.org_name")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#4ADE80] pulse" />
                    <span className="text-[#4ADE80] text-[9px] font-black uppercase tracking-widest">{t("hero.scene_live")}</span>
                  </div>
                </div>

                <ConstructionScene />

                {/* ── Hero stats footer ──────────────────────────────────
                    Each card combines a hard-coded baseline (cumulative
                    achievements that predate the DB) with a live DB count.

                    Baseline constants:
                      INIT_WOREDAS    = 10   (woredas already covered)
                      INIT_CITIZENS   = 5000 (citizens served before DB)
                      INIT_COMPLETED  = 95   (projects delivered before DB)
                      INIT_YEARS      = 4    (office years of operation)

                    Live additions (from Supabase):
                      woredas   → not stored per-project; we show baseline + 0
                                  (swap for a real count if you add a woredas table)
                      citizens  → not stored; show baseline only
                      completed → baseline + completed.length from DB
                      years     → baseline only (static, not in DB)
                ──────────────────────────────────────────────────────── */}
                {(() => {
                  // ── Baseline numbers (office history before DB records) ──
                  const INIT_WOREDAS   = 10;
                  const INIT_CITIZENS  = 5_000;
                  const INIT_COMPLETED = 95;
                  const INIT_YEARS     = 4;

                  // ── Combined values: baseline + live DB delta ──
                  const stats = [
                    {
                      // Woredas: static baseline (no per-project woreda count in DB yet)
                      value:   INIT_WOREDAS,
                      display: `${INIT_WOREDAS}+`,
                      labelKey: "hero.stat_woredas",
                      // tooltip: replace 0 with a real DB woreda count if available
                      liveAdded: 0,
                    },
                    {
                      // Citizens: static baseline (no per-project citizen count in DB)
                      value:   INIT_CITIZENS,
                      display: `${(INIT_CITIZENS / 1_000).toFixed(0)}K+`,
                      labelKey: "hero.stat_citizens",
                      liveAdded: 0,
                    },
                    {
                      // Completed projects: baseline + all DB-completed projects
                      value:    INIT_COMPLETED + completed.length,
                      display: `${INIT_COMPLETED + completed.length}+`,
                      labelKey: "hero.stat_completed",
                      liveAdded: completed.length,
                    },
                    {
                      // Years of service: static (founded year calculation)
                      value:   INIT_YEARS,
                      display: `${INIT_YEARS}+`,
                      labelKey: "hero.stat_years",
                      liveAdded: 0,
                    },
                  ] as const;

                  return (
                    <div className="border-t border-white/[0.06] grid grid-cols-2 gap-px bg-white/[0.04]">
                      {stats.map((s, i) => (
                        <div key={i} className="bg-[#0A1628] px-4 py-3 text-center relative group">
                          {/* Main value */}
                          <p className="text-[22px] font-black text-[#E85D1A] leading-none mb-1">
                            {s.display}
                          </p>

                          {/* Label */}
                          <p className={`text-white/30 font-black ${isAm ? `${am} text-[10px]` : "text-[9px] uppercase tracking-wider"}`}>
                            {t(s.labelKey)}
                          </p>

                          {/* Live DB badge — only shown when DB added something */}
                          {s.liveAdded > 0 && (
                            <span
                              title={`+${s.liveAdded} from live database`}
                              className="absolute top-1.5 right-1.5 text-[8px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.5 leading-none"
                            >
                              +{s.liveAdded}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div className="bg-white/[0.02] border-t border-white/[0.06] px-6 py-3 flex items-center justify-between">
                  <span className="text-[11px] text-white/25">{t("statistics.portfolio_label")}</span>
                  <span className="text-[14px] font-black text-white">
                    {fmt(totalBudget)} <span className="text-[10px] font-bold text-white/25">ETB</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          2. KPI STRIP
      ══════════════════════════════════════════ */}
      <section className="bg-[#E85D1A]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/20">
            {[
              { val: projs.length,              labelKey: "statistics.active_projects",        amKey: "statistics.active_projects"        },
              { val: fmt(totalBudget) + " ETB", labelKey: "statistics.portfolio_label",        amKey: "statistics.portfolio_label"        },
              { val: allContractors.length,     labelKey: "statistics.registered_contractors", amKey: "statistics.registered_contractors" },
              { val: openTenders.length,        labelKey: "statistics.open_tenders",           amKey: "statistics.open_tenders"           },
            ].map(s => (
              <div key={s.labelKey} className="flex flex-col items-center justify-center py-10 px-6 text-center gap-1">
                <p className="text-[38px] font-black text-white leading-none">{s.val}</p>
                <p className={`text-white/75 font-black ${isAm ? `${am} text-[13px]` : "text-[10px] uppercase tracking-[0.2em]"}`}>
                  {t(s.labelKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          3. SECTOR HIGHLIGHTS
      ══════════════════════════════════════════ */}
      <section className="bg-[#0D1F38] py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <p className={`font-black text-[#E85D1A] mb-4 ${isAm ? `${am} text-sm` : "text-[10px] uppercase tracking-[0.45em]"}`}>
              {t("statistics.eyebrow")}
            </p>
            <h2 className={`serif text-white leading-tight tracking-tight ${isAm ? `${am} text-[38px]` : "text-[48px]"}`}>
              {t("statistics.title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {Object.entries(SECTOR_STYLES).map(([sector, meta]) => {
              const stats = sectorMap[sector] || { count: 0, completed: 0 };
              const pct = stats.count > 0 ? Math.round((stats.completed / stats.count) * 100) : 0;
              const desc = SECTOR_DESC[sector];
              return (
                <Link key={sector} href={`/${locale}/projects?sector=${sector}`} className="card-dark p-7 block">
                  <div className={`font-black mb-5 ${meta.color} ${isAm ? `${am} text-xs` : "text-[10px] uppercase tracking-[0.2em]"}`}>
                    ◆ {sector}
                  </div>
                  <h3 className={`serif text-white leading-tight mb-3 ${isAm ? `${am} text-[20px]` : "text-[22px]"}`}>{sector}</h3>
                  <p className={`text-white/35 leading-relaxed mb-1 ${isAm ? `${am} text-[12px]` : "text-[13px]"}`}>
                    {isAm ? desc?.am : desc?.en}
                  </p>
                  <div className="flex justify-between font-black text-white/30 mb-2 mt-5 text-[10px] uppercase tracking-wider">
                    <span>{stats.count} total</span>
                    <span className={meta.color}>{pct}% done</span>
                  </div>
                  <div className="h-[3px] bg-white/8 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          4. ACTIVE PROJECTS
      ══════════════════════════════════════════ */}
      <section className="bg-[#F4F5F7] py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-end justify-between mb-14">
            <SH eyebrow={t("projects.eyebrow")} title={t("projects.title")} accent="#E85D1A" dark={false} isAm={isAm} />
            <Link href={`/${locale}/projects`}
              className={`inline-flex items-center gap-2 font-black text-slate-400 hover:text-[#E85D1A] uppercase transition-colors whitespace-nowrap ${isAm ? `${am} text-sm tracking-normal` : "text-[12px] tracking-[0.14em]"}`}>
              {t("projects.view_all")} <ArrowRight size={13} strokeWidth={2.5} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.length === 0 ? (
              <div className="col-span-3 bg-white border border-slate-200 p-16 text-center">
                <Building2 size={32} className="text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
                <p className={`text-slate-400 font-bold text-sm ${am}`}>{t("projects.empty")}</p>
              </div>
            ) : featured.map((p: any) => {
              const sm   = SECTOR_STYLES[p.sector || ""] || { topBar: "bg-slate-400", badge: "bg-slate-100 text-slate-600", progress: "bg-slate-400", bar: "bg-slate-400", color: "text-slate-400" };
              const days = calcDaysLeft(p.expected_end_date);
              return (
                <div key={p.id} className="card-light overflow-hidden flex flex-col group">
                  <div className="relative">
                    <ProjectImagePlaceholder sector={p.sector} label={sectorLabel(p.sector)} />
                    <div className={`absolute top-3 left-3 text-[9px] font-black px-2.5 py-1 uppercase tracking-wider ${
                      p.status === "Ongoing" ? "bg-emerald-500 text-white" : p.status === "Completed" ? "bg-blue-500 text-white" : "bg-amber-500 text-white"
                    }`}>{p.status}</div>
                    {p.sector && <div className={`absolute top-3 right-3 text-[9px] font-black px-2.5 py-1 uppercase tracking-wider ${sm.badge}`}>{p.sector}</div>}
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-black text-slate-900 text-[15px] uppercase tracking-tight group-hover:text-[#E85D1A] transition-colors leading-snug mb-2">{p.name}</h3>
                    {p.location && <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold mb-3"><MapPin size={10} strokeWidth={2} />{p.location}</div>}

                    <div className="mt-auto">
                      <div className="flex justify-between text-[10px] font-black text-slate-400 mb-1.5">
                        <span className={`uppercase tracking-wider ${am}`}>{t("projects.progress")}</span>
                        <span className="text-[#E85D1A]">{p.progress ?? 0}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 overflow-hidden">
                        <div className="h-full bg-[#E85D1A]" style={{ width: `${p.progress ?? 0}%` }} />
                      </div>
                    </div>

                    {p.contractor_name && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold mt-3">
                        <HardHat size={10} strokeWidth={2} />
                        <span className="truncate">{p.contractor_name}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                      {p.budget ? (
                        <span className="text-[11px] text-slate-400 font-bold">
                          <span className={am}>{t("projects.budget")}</span>{" "}
                          <span className="text-slate-700">{fmt(Number(p.budget))} ETB</span>
                        </span>
                      ) : <span />}
                      {days !== null && (
                        <span className={`text-[9px] font-black px-2.5 py-1 uppercase tracking-wider ${
                          days < 0 ? "bg-red-100 text-red-600" : days <= 30 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {days < 0
                            ? `${Math.abs(days)}d ${t("projects.overdue")}`
                            : `${days}d ${t("projects.left")}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          5. TENDERS
      ══════════════════════════════════════════ */}
      <section className="bg-[#0A1628] py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-end justify-between mb-14">
            <SH eyebrow={t("tenders.eyebrow")} title={t("tenders.title")} accent="#E85D1A" dark isAm={isAm} />
            <Link href={`/${locale}/tenders`}
              className={`inline-flex items-center gap-2 font-black text-white/30 hover:text-[#E85D1A] uppercase transition-colors whitespace-nowrap ${isAm ? `${am} text-sm tracking-normal` : "text-[12px] tracking-[0.14em]"}`}>
              {t("tenders.view_all")} <ArrowRight size={13} strokeWidth={2.5} />
            </Link>
          </div>

          {allTenders.length === 0 ? (
            <div className="card-dark p-16 text-center">
              <FileText size={32} className="text-white/15 mx-auto mb-3" strokeWidth={1.5} />
              <p className={`text-white/30 font-bold ${am}`}>{t("tenders.empty")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allTenders.map((tn: any) => {
                const deadline = tn.submission_deadline ? new Date(tn.submission_deadline) : null;
                const days = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86400000) : null;
                const urgent = days !== null && days >= 0 && days <= 7;
                return (
                  <Link key={tn.tender_id} href={`/${locale}/tenders/${tn.tender_id}`}
                    className="card-dark flex items-center gap-5 px-6 py-4 group hover:border-[#E85D1A]/40 border border-transparent transition-all rounded-none">
                    {/* Accent dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${urgent ? "bg-red-400" : "bg-[#E85D1A]"}`} />
                    {/* Ref */}
                    <span className="text-[9px] font-black text-[#E85D1A]/60 font-mono tracking-widest w-28 shrink-0 hidden sm:block">
                      {tn.ref_no}
                    </span>
                    {/* Title */}
                    <span className={`flex-1 font-black text-white/80 group-hover:text-[#E85D1A] transition-colors truncate ${isAm ? `${am} text-[13px]` : "text-[13px] uppercase tracking-tight"}`}>
                      {tn.title}
                    </span>
                    {/* Type */}
                    {tn.project_type && (
                      <span className="text-[9px] font-black text-white/25 uppercase tracking-wider hidden md:block shrink-0">
                        {tn.project_type}
                      </span>
                    )}
                    {/* Woreda */}
                    {tn.woreda && (
                      <span className="text-[10px] font-bold text-white/30 hidden lg:block shrink-0">
                        {tn.woreda}
                      </span>
                    )}
                    {/* Deadline countdown */}
                    {days !== null && days >= 0 && (
                      <span className={`text-[9px] font-black px-2.5 py-1 shrink-0 ${urgent ? "bg-red-500/15 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                        {days}d {t("tenders.left")}
                      </span>
                    )}
                    <ArrowRight size={13} className="text-white/15 group-hover:text-[#E85D1A] transition-colors shrink-0" />
                  </Link>
                );
              })}
              <div className="pt-2">
                <Link href={`/${locale}/tenders`}
                  className={`inline-flex items-center gap-2 font-black text-white/25 hover:text-[#E85D1A] uppercase transition-colors ${isAm ? `${am} text-sm tracking-normal` : "text-[11px] tracking-[0.14em]"}`}>
                  {t("tenders.view_all")} <ArrowRight size={12} strokeWidth={2.5} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          6. NEWS & ANNOUNCEMENTS
      ══════════════════════════════════════════ */}
      <section className="bg-[#F4F5F7] py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-end justify-between mb-14">
            <SH eyebrow={t("news.eyebrow")} title={t("news.title")} accent="#E85D1A" dark={false} isAm={isAm} />
            <button className={`inline-flex items-center gap-2 font-black text-slate-400 hover:text-[#E85D1A] uppercase transition-colors ${isAm ? `${am} text-sm tracking-normal` : "text-[12px] tracking-[0.14em]"}`}>
              {t("news.view_all")} <ArrowRight size={13} strokeWidth={2.5} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {arr("news.ann").map((item, i) => (
              <div key={i} className="card-light flex flex-col group cursor-pointer overflow-hidden">
                <div className={`h-1 ${i === 0 ? "bg-[#E85D1A]" : i === 1 ? "bg-[#0A1628]" : "bg-[#039737]"}`} />
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`text-[9px] font-black px-2.5 py-1 uppercase tracking-wider ${ANN_TAG_COLORS[i]}`}>{item.tag}</span>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold">
                      <CalendarDays size={10} strokeWidth={2} />{item.date}
                    </div>
                  </div>
                  <h3 className={`font-black text-slate-900 leading-snug mb-3 group-hover:text-[#E85D1A] transition-colors ${isAm ? `${am} text-[14px]` : "text-[15.5px]"}`}>
                    {item.title}
                  </h3>
                  <p className={`text-slate-500 leading-relaxed flex-1 line-clamp-3 ${isAm ? `${am} text-[12.5px]` : "text-[13.5px]"}`}>
                    {item.body}
                  </p>
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <span className={`inline-flex items-center gap-1.5 font-black text-slate-300 group-hover:text-[#E85D1A] group-hover:gap-2.5 transition-all ${isAm ? `${am} text-sm` : "text-[10px] uppercase tracking-wider"}`}>
                      {t("news.read_more")} <ChevronRight size={10} strokeWidth={2.5} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          7. CITIZEN SERVICES
      ══════════════════════════════════════════ */}
      <section className="bg-[#0D1F38] py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="mb-14">
            <SH eyebrow={t("citizen_services.eyebrow")} title={t("citizen_services.title")} accent="#E85D1A" dark isAm={isAm} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
            {[
              { tKey: "permit",  icon: <Building2 size={28} strokeWidth={1.75} />,    bg: "bg-white",      titleC: "text-slate-900", descC: "text-slate-500",  iconC: "text-[#0A1628]",  ctaStyle: "bg-[#0A1628] hover:bg-[#071220] text-white"     },
              { tKey: "illegal", icon: <AlertTriangle size={28} strokeWidth={1.75} />, bg: "bg-[#E85D1A]",  titleC: "text-white",     descC: "text-white/60",  iconC: "text-white/80",   ctaStyle: "bg-white hover:bg-orange-50 text-[#E85D1A]"     },
              { tKey: "land",    icon: <Download size={28} strokeWidth={1.75} />,      bg: "bg-white",      titleC: "text-slate-900", descC: "text-slate-500",  iconC: "text-[#039737]",  ctaStyle: "bg-[#039737] hover:bg-[#027a2d] text-white"     },
            ].map(svc => (
              <Link key={svc.tKey} href={`/${locale}/services`}
                className={`${svc.bg} p-7 flex flex-col group hover:shadow-2xl transition-all duration-200`}>
                <div className={`${svc.iconC} mb-5`}>{svc.icon}</div>
                <h3 className={`serif leading-tight tracking-tight mb-2 ${svc.titleC} ${isAm ? `${am} text-[18px]` : "text-[22px]"}`}>
                  {t(`citizen_services.${svc.tKey}_title`)}
                </h3>
                <p className={`leading-relaxed flex-1 mb-6 ${svc.descC} ${isAm ? `${am} text-[13px]` : "text-[13.5px]"}`}>
                  {t(`citizen_services.${svc.tKey}_desc`)}
                </p>
                <span className={`inline-flex items-center justify-center gap-2 py-3 px-5 font-black transition-colors ${svc.ctaStyle} ${isAm ? `${am} text-sm` : "text-[11px] uppercase tracking-[0.18em]"}`}>
                  {t(`citizen_services.${svc.tKey}_cta`)} <ArrowRight size={12} strokeWidth={2.5} />
                </span>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: "citizen_services.quick_track",      icon: <TrendingUp size={14} strokeWidth={2} />  },
              { key: "citizen_services.quick_inspection", icon: <ShieldCheck size={14} strokeWidth={2} /> },
              { key: "citizen_services.quick_register",   icon: <FileText size={14} strokeWidth={2} />    },
              { key: "citizen_services.quick_contact",    icon: <Phone size={14} strokeWidth={2} />       },
            ].map(item => (
              <Link key={item.key} href={`/${locale}/services`}
                className={`flex items-center justify-center gap-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#E85D1A]/40 text-white/50 hover:text-white py-4 px-4 transition-all ${isAm ? `${am} text-sm` : "text-[11px] font-black uppercase tracking-[0.12em]"}`}>
                <span className="text-white/25 shrink-0">{item.icon}</span>
                {t(item.key)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          8. TRANSPARENCY
      ══════════════════════════════════════════ */}
      <section className="bg-[#F4F5F7] py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="mb-10">
            <SH eyebrow={t("transparency.eyebrow")} title={t("transparency.title")} accent="#E85D1A" dark={false} isAm={isAm} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { tKey: "annual",  icon: <BarChart3 size={32} strokeWidth={1.5} />, color: "text-[#0A1628]", bg: "bg-white", ctaIcon: <Download size={13} />    },
              { tKey: "budget",  icon: <PieChart size={32} strokeWidth={1.5} />,  color: "text-[#E85D1A]", bg: "bg-white", ctaIcon: <Eye size={13} />          },
              { tKey: "project", icon: <Activity size={32} strokeWidth={1.5} />,  color: "text-[#039737]", bg: "bg-white", ctaIcon: <ExternalLink size={13} /> },
            ].map(card => (
              <div key={card.tKey} className="card-light p-7 flex flex-col">
                <div className={`${card.color} mb-5 opacity-70`}>{card.icon}</div>
                <h3 className={`font-black text-slate-900 mb-3 ${isAm ? `${am} text-[17px]` : "text-[18px]"}`}>{t(`transparency.${card.tKey}_title`)}</h3>
                <p className={`text-slate-500 leading-relaxed flex-1 mb-5 ${isAm ? `${am} text-[12.5px]` : "text-[13px]"}`}>{t(`transparency.${card.tKey}_desc`)}</p>
                <div className="h-px bg-slate-100 mb-5" />
                <Link href={`/${locale}/about`}
                  className={`inline-flex items-center gap-2 font-black ${card.color} hover:underline ${isAm ? `${am} text-sm` : "text-[11px] uppercase tracking-wider"}`}>
                  {card.ctaIcon} {t(`transparency.${card.tKey}_cta`)}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          9. FOOTER
      ══════════════════════════════════════════ */}
      <footer className="bg-[#0A1628] text-white">
        {/* Contact bar */}
        <div className="bg-[#071220] border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
            {[
              { icon: <MapPin size={13} />,  lKey: "footer.address_label", vKey: "footer.address_val" },
              { icon: <Phone size={13} />,   lKey: "footer.phone_label",   vKey: "footer.phone_val"   },
              { icon: <Mail size={13} />,    lKey: "footer.email_label",   vKey: "footer.email_val"   },
            ].map(c => (
              <div key={c.lKey} className="flex items-start gap-3 py-2 md:py-0 md:px-6 first:pl-0">
                <span className="text-[#E85D1A] mt-0.5 shrink-0">{c.icon}</span>
                <div>
                  <p className={`text-white/25 font-black mb-0.5 ${isAm ? am : "text-[9px] uppercase tracking-widest"}`}>{t(c.lKey)}</p>
                  <p className={`text-white/50 text-sm ${am}`}>{t(c.vKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main grid */}
        <div className="max-w-7xl mx-auto px-8 py-14 grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-[#E85D1A] flex items-center justify-center shrink-0">
                <span className="text-white font-black text-lg amharic leading-none">ሌ</span>
              </div>
              <div>
                <p className={`font-black text-white text-sm leading-tight ${am}`}>{t("footer.org_name")}</p>
                <p className={`text-white/20 ${isAm ? `${am} text-[10px]` : "text-[9px] uppercase tracking-widest"}`}>{t("footer.org_sub")}</p>
              </div>
            </div>
            <p className={`text-white/30 text-sm leading-relaxed max-w-[280px] ${isAm ? `${am} text-[12px]` : ""}`}>{t("footer.about")}</p>
            <div className="mt-6 border-t border-white/[0.07] pt-5">
              <p className={`font-black text-white/20 mb-3 ${isAm ? am : "text-[9px] uppercase tracking-widest"}`}>{t("footer.hours_label")}</p>
              <div className="space-y-1.5 text-xs">
                {arr("footer.hours").map((h: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span className={`text-white/30 ${am}`}>{h.day}</span>
                    <span className={i < 2 ? "text-white/55 font-medium" : "text-white/15"}>{h.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <p className={`font-black text-[#E85D1A] mb-5 ${isAm ? `${am} text-sm` : "text-[9px] uppercase tracking-[0.2em]"}`}>{t("footer.nav_title")}</p>
            <ul className="space-y-3">
              {arr("footer.nav").map((label: string, i: number) => (
                <li key={i}>
                  <Link href={`/${locale}${NAV_HREFS[i] ?? "/"}`} className={`text-sm text-white/35 hover:text-white transition-colors ${am}`}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <p className={`font-black text-[#039737] mb-5 ${isAm ? `${am} text-sm` : "text-[9px] uppercase tracking-[0.2em]"}`}>{t("footer.services_title")}</p>
            <ul className="space-y-3">
              {arr("footer.services").map((s: string, i: number) => (
                <li key={i} className={`text-sm text-white/30 ${am}`}>{s}</li>
              ))}
            </ul>
          </div>

          {/* Contact + Social */}
          <div>
            <p className={`font-black text-white/20 mb-5 ${isAm ? `${am} text-sm` : "text-[9px] uppercase tracking-[0.2em]"}`}>{t("footer.contact_title")}</p>
            <ul className="space-y-3 mb-6">
              {arr("footer.contact").map((c: string, i: number) => (
                <li key={i} className={`text-sm text-white/25 ${am}`}>{c}</li>
              ))}
            </ul>
            <div className="border-t border-white/[0.07] pt-5">
              <p className={`font-black text-white/15 mb-3 ${isAm ? am : "text-[9px] uppercase tracking-widest"}`}>{t("footer.social_title")}</p>
              <div className="flex gap-2 flex-wrap">
                {arr("footer.social").map((s: string) => (
                  <button key={s} className="text-[9px] font-black px-3 py-1.5 border border-white/10 text-white/25 hover:text-white/55 hover:border-white/25 transition-colors uppercase tracking-wider">{s}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="border-t border-white/[0.05] bg-[#060F1E]">
          <div className="max-w-7xl mx-auto px-8 py-4 flex flex-wrap items-center justify-between gap-4">
            <p className="text-white/12 text-xs">&copy; {new Date().getFullYear()} {t("footer.copyright")} | {t("footer.city")}</p>
            <Link href={`/${locale}/admin`}
              className="flex items-center gap-1.5 text-white/12 hover:text-white/35 text-[9px] font-black uppercase tracking-widest transition-colors">
              <ShieldCheck size={9} /> {t("footer.admin")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}