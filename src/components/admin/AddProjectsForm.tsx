"use client";

import { useState } from "react";
import { saveProject } from "@/lib/actions/projects";
import { Loader2, ArrowRight, AlertCircle, Briefcase, Calendar, CheckCircle, XCircle,Save , FileUp,HardHat, MapPin} from "lucide-react";
import { toast } from "sonner";
import { FileUpload } from "./FileUpload";

interface Props {
  onProjectCreated?: (id: string) => void;
  initialData?: any;
}


export function AddProjectForm() {
  const [step, setStep] = useState<number>(1); 
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStep1(formData: FormData) {
    setLoading(true);
    if (!formData.get("status")) formData.append("status", "Design Phase");

    const result = await saveProject(formData);
    setLoading(false);

    if (result.success && result.id) {
      setProjectId(result.id);
      setStep(2); 
      toast.success("Project Created");
    } else {
      toast.error("Entry Failed", { description: result.error });
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${step === 1 ? 'bg-gov-blue text-white' : 'bg-emerald-500 text-white'}`}>
          {step > 1 ? <CheckCircle size={14} /> : "01"} Project Data
        </div>
        <div className="h-px w-8 bg-slate-200" />
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${step === 2 ? 'bg-gov-blue text-white' : 'bg-slate-100 text-slate-400'}`}>
          02 Evidence Upload
        </div>
      </div>

      {step === 1 && (
        <form action={handleStep1} className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
         <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase">Project name</label>
            <input name="name" required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-gov-blue/5 outline-none transition-all" placeholder="name" />
          </div>

          {/* New: Location Field */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
               Site Location
            </label>
            <input name="location" required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-gov-blue/5 outline-none transition-all" placeholder=" site location " />
          </div>


        {/* Sector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sector</label>
          <select name="sector" className="form-input-gov" required>
            <option value="Schools">Schools</option>
            <option value="Health">Health</option>
            <option value="Youth">Youth</option>
            <option value="Libraries">Libraries</option>
            <option value="Other">Other</option>
          </select>
        </div>

      {/* Advisor */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
            </label>
            <input name="advisor" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none" placeholder="Engineer Name" />
          </div>
        {/* <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase"> Status</label>
        <input type="hidden" name="status" value="Active" />
         <select name="status" className="form-input-gov" defaultValue="Active">
         <option value="comleted">Completed </option>
         <option value="active">Active</option>
         <option value="Ongoing">Ongoing</option>
         <option value="On Hold">On Hold</option>
        </select>
        </div> */}

        <div className="space-y-2">
  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
    Project Phase
  </label>
  <select 
    name="status" 
    className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-600 rounded-2xl font-bold outline-none appearance-none transition-all"
    defaultValue="Design Phase"
  >
    <option value="Design Phase">Design Phase (Technical Review)</option>
    <option value="BOQ Verification">BOQ Verification (Cost Audit)</option>
    <option value="Ongoing">Ongoing (Construction Started)</option>
    <option value="On Hold">On Hold (Suspended)</option>
    <option value="Completed">Completed (Final Handover)</option>
  </select>
</div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Progress (%)</label>
          <input name="progress" type="number" min="0" max="100" defaultValue="0" className="form-input-gov" />
        </div>

      {/* Budget */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Project Budget</label>
  <div className="flex gap-2">
    <input name="budget" type="number" step="0.01" required className="form-input-gov flex-1" placeholder="0.00" />
    <select name="currency" className="form-input-gov w-24">
      <option value="ETB">ETB</option>
      <option value="USD">USD</option>
      <option value="EUR">EUR</option>
        <option value="GBP">GBP</option>
        <option value="JYP">JYP</option>
        <option value="CNY">CNY</option>
        <option value="AUD">AUD</option>
        <option value="CAD">CAD</option>

    </select>
    
  </div>
        </div>

          <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">start Date</label>
          <div className="relative">
            <input name="start_date" type="date" required className="form-input-gov pl-10" />
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
        </div>


        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expected End Date</label>
          <div className="relative">
            <input name="expected_end_date" type="date" required className="form-input-gov pl-10" />
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
        </div>

  

        
     

      {/* Bilingual Descriptions */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase font-amharic"> መግለጫ (አማ)</label>
          <textarea name="description_am" rows={3} className="form-input-gov font-amharic text-base" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase"> Description(en)</label>
          <textarea name="description_en" rows={3} className="form-input-gov" />
        </div>
        </div>

          <button type="submit" disabled={loading} className="md:col-span-2 w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-gov-blue flex items-center justify-center gap-2 transition-all">
            {loading ? <Loader2 className="animate-spin" /> : <>Next: Attach Evidence <ArrowRight size={18} /></>}
          </button>
        </form>
      )}

      {step === 2 && projectId && (
        <div className="animate-in slide-in-from-right-4 duration-300">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-6">
            <p className="text-xs text-gov-blue font-bold flex items-center gap-2">
              <CheckCircle size={14} /> Project ID {projectId.slice(0, 8)} initialized successfully.
            </p>
          </div>

          <FileUpload 
            projectId={projectId} 
            onUploadComplete={() => toast.success("File synchronized with database.")} 
          />

          <div className="mt-8 pt-6 border-t flex justify-end">
            <button 
              onClick={() => window.location.href = `/admin/projects/${projectId}`}
              className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-100"
            >
              Complete Forensic Entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}