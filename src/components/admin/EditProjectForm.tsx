"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProject } from "@/lib/actions/projects";
import { toast } from "sonner";
import {
  Loader2, Save, XCircle, Calendar,
  User, MapPin, DollarSign,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "Design Phase",     label: "Design Phase (Technical Review)" },
  { value: "BOQ Verification", label: "BOQ Verification (Cost Audit)" },
  { value: "Ongoing",          label: "Ongoing (Construction Started)" },
  { value: "On Hold",          label: "On Hold (Suspended)" },
  { value: "Completed",        label: "Completed (Final Handover)" },
];

const SECTOR_OPTIONS = ["Schools", "Health", "Youth", "Libraries"];

const CURRENCY_OPTIONS = ["ETB", "USD", "EUR", "GBP", "AUD", "CAD", "JPY", "CNY"];

export function EditProjectForm({ project }: { project: any }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await saveProject(formData, project.id);

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      toast.success("Audit Log Updated", {
        description: `Changes to "${project.name}" have been saved.`,
      });
      setTimeout(() => {
        router.push(`/admin/projects/${project.id}`);
        router.refresh();
      }, 1500);
    } else {
      toast.error("Update Error", { description: result.error });
    }
  }

  return (
    <form onSubmit={handleUpdate} className="space-y-8">

      {/* Audit Trail Header */}
      <div className="bg-slate-50 border-l-4 border-gov-blue p-5 rounded-r-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px]">
          <div>
            <span className="text-slate-400 block uppercase font-bold">Created</span>
            <span className="text-slate-700 font-mono">
              {new Date(project.created_at).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block uppercase font-bold">Last Updated</span>
            <span className="text-slate-700 font-mono">
              {project.updated_at
                ? new Date(project.updated_at).toLocaleString()
                : "No prior edits"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Project Name */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Project Name
          </label>
          <input
            name="name"
            defaultValue={project.name}
            required
            className="form-input-gov"
          />
        </div>

        {/* Sector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Sector
          </label>
          <select name="sector" defaultValue={project.sector} className="form-input-gov">
            {SECTOR_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Budget + Currency */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Budget Allocation
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                name="budget"
                type="number"
                step="0.01"
                min="0"
                defaultValue={project.budget}
                required
                className="form-input-gov pl-10 w-full"
              />
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
            <select
              name="currency"
              defaultValue={project.currency ?? "ETB"}
              className="form-input-gov w-28 font-bold bg-slate-50"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Project Phase / Status */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Project Phase
          </label>
          <select
            name="status"
            defaultValue={project.status}
            required
            className="form-input-gov"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Current Progress (%)
          </label>
          <input
            name="progress"
            type="number"
            min="0"
            max="100"
            defaultValue={project.progress ?? 0}
            required
            className="form-input-gov"
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Location
          </label>
          <div className="relative">
            <input
              name="location"
              defaultValue={project.location}
              required
              className="form-input-gov pl-10"
            />
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
        </div>

        {/* Advisor */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Technical Advisor
          </label>
          <div className="relative">
            <input
              name="advisor"
              defaultValue={project.advisor}
              className="form-input-gov pl-10"
            />
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Start Date
          </label>
          <div className="relative">
            <input
              name="start_date"
              type="date"
              defaultValue={project.start_date ?? ""}
              className="form-input-gov pl-10"
            />
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
        </div>

        {/* Expected Completion */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Expected Completion
          </label>
          <div className="relative">
            <input
              name="expected_end_date"
              type="date"
              defaultValue={project.expected_end_date ?? ""}
              className="form-input-gov pl-10"
            />
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
        </div>

      </div>

      {/* Descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Description (EN)
          </label>
          <textarea
            name="description_en"
            defaultValue={project.description_en}
            rows={4}
            className="form-input-gov"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-amharic">
            የፕሮጀክት መግለጫ (AM)
          </label>
          <textarea
            name="description_am"
            defaultValue={project.description_am}
            rows={4}
            className="form-input-gov font-amharic"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-4 rounded-xl font-bold uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-2 border border-slate-200"
        >
          <XCircle size={18} /> Discard Changes
        </button>

        <button
          type="submit"
          disabled={loading || success}
          className={`flex-[2] py-4 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${
            success
              ? "bg-emerald-500 text-white"
              : "bg-gov-blue text-white hover:bg-slate-800 active:scale-[0.98]"
          }`}
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : success ? (
            <><Save size={18} /> Saved Successfully</>
          ) : (
            <><Save size={18} /> Commit Changes</>
          )}
        </button>
      </div>

    </form>
  );
}