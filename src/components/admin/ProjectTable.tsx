"use client";
// src/components/admin/ProjectTable.tsx
// ── Edit button now calls onEdit(project) callback → opens modal in projects/page.tsx
// ── No navigation to /admin/manage-projects anymore

import { Edit3, Trash2, ExternalLink, MapPin, Building2 } from "lucide-react";
import Link from "next/link";

// ─── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "Planned":          { bg: "bg-sky-50",     text: "text-sky-700",      border: "border-sky-200",     dot: "bg-sky-400"      },
  "Design Phase":     { bg: "bg-purple-50",  text: "text-purple-700",   border: "border-purple-200",  dot: "bg-purple-500"   },
  "BOQ Verification": { bg: "bg-amber-50",   text: "text-amber-700",    border: "border-amber-200",   dot: "bg-amber-500"    },
  "Ongoing":          { bg: "bg-emerald-50", text: "text-emerald-700",  border: "border-emerald-200", dot: "bg-emerald-500"  },
  "On Hold":          { bg: "bg-red-50",     text: "text-red-700",      border: "border-red-200",     dot: "bg-red-500"      },
  "Completed":        { bg: "bg-blue-50",    text: "text-blue-700",     border: "border-blue-200",    dot: "bg-blue-500"     },
};
const FALLBACK = { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200", dot: "bg-slate-400" };

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? FALLBACK;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {status || "Unknown"}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  const color =
    pct >= 100 ? "bg-blue-500" :
    pct >= 60  ? "bg-emerald-500" :
    pct >= 30  ? "bg-amber-500" : "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[9px] font-black text-slate-500 tabular-nums w-7 text-right">{pct}%</span>
    </div>
  );
}

export function ProjectTable({
  projects,
  onDelete,
  onEdit,
}: {
  projects: any[];
  onDelete: (id: string, name: string) => void;
  onEdit: (project: any) => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">

        {/* ── Header ── */}
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80">
            {["Project", "Location", "Contractor", "Budget", "Progress", "Status", "Actions"].map((col) => (
              <th
                key={col}
                className={`px-5 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap ${col === "Actions" ? "text-right" : ""}`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody className="divide-y divide-slate-50">
          {projects.map((project) => {
            const contractor = project.contractors;
            return (
              <tr
                key={project.id}
                className="group hover:bg-[#F4F6F9]/60 transition-colors duration-150"
              >
                {/* Project Name + Sector */}
                <td className="px-5 py-4 max-w-[200px]">
                  <span className="text-sm font-bold text-[#2C2C2C] block truncate leading-snug">
                    {project.name}
                  </span>
                  {project.name_am && (
                    <span className="text-[10px] text-[#0A1628]/60 font-bold font-amharic block truncate leading-snug">
                      {project.name_am}
                    </span>
                  )}
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    {project.sector}
                  </span>
                </td>

                {/* Location */}
                <td className="px-5 py-4">
                  <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                    <MapPin size={10} className="text-slate-300 shrink-0" />
                    {project.location || "—"}
                  </span>
                </td>

                {/* Contractor */}
                <td className="px-5 py-4 max-w-[160px]">
                  {contractor ? (
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1 text-[11px] text-slate-700 font-semibold truncate">
                        <Building2 size={10} className="text-slate-300 shrink-0" />
                        {contractor.company_name}
                      </span>
                      {contractor.is_verified && (
                        <span className="text-[8px] text-emerald-600 font-black uppercase tracking-wider mt-0.5">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-300 font-bold italic">Unassigned</span>
                  )}
                </td>

                {/* Budget */}
                <td className="px-5 py-4 whitespace-nowrap">
                  <span className="text-sm font-black text-[#0A1628] font-mono tracking-tight">
                    {project.currency}{" "}
                    {project.budget != null ? Number(project.budget).toLocaleString() : "—"}
                  </span>
                </td>

                {/* Progress */}
                <td className="px-5 py-4 min-w-[120px]">
                  <ProgressBar value={project.progress} />
                </td>

                {/* Status */}
                <td className="px-5 py-4 whitespace-nowrap">
                  <StatusBadge status={project.status} />
                </td>

                {/* Actions */}
                <td className="px-5 py-4">
                  <div className="flex justify-end items-center gap-1.5">
                    <Link
                      href={`/admin/projects/${project.id}`}
                      title="View detail"
                      className="p-2 rounded-xl text-[#0A1628] bg-[#0A1628]/10 hover:bg-[#0A1628] hover:text-white transition-all"
                    >
                      <ExternalLink size={15} />
                    </Link>
                    {/* ── Edit now opens the modal via callback ── */}
                    <button
                      onClick={() => onEdit(project)}
                      title="Edit project"
                      className="p-2 rounded-xl text-amber-600 bg-amber-50 hover:bg-amber-500 hover:text-white transition-all"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => onDelete(project.id, project.name)}
                      title="Delete project"
                      className="p-2 rounded-xl text-red-500 bg-red-50 hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}