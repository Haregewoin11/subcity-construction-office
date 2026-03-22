"use client";

import React, { useState } from "react";
import { 
  Upload, FileText, CheckCircle2, Loader2, 
  AlertTriangle, hardHat, ShieldAlert, X 
} from "lucide-react";
import { createClient } from "@/lib/actions/supabase/clients";
import { toast } from "sonner";

interface Props {
  projectId: string;
  projectName: string;
  onSuccess: () => void;
}

export default function DesignUploadForm({ projectId, projectName, onSuccess }: Props) {
  const supabase = createClient();
  
  // State Management
  const [file, setFile] = useState<File | null>(null);
  const [drawingType, setDrawingType] = useState("Architectural");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  const drawingTypes = [
    "Architectural", 
    "Structural", 
    "Electrical", 
    "Mechanical/Plumbing (MEP)", 
    "Site Plan",
    "BOQ Draft"
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === "application/pdf") {
      setFile(selected);
    } else {
      toast.error("Please upload a valid PDF document");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("File is required");

    setUploading(true);
    try {
      // 1. Storage Path: projects/[id]/designs/[type]_[timestamp].pdf
      const fileExt = file.name.split('.').pop();
      const path = `projects/${projectId}/designs/${drawingType}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('technical-drawings')
        .upload(path, file);

      if (uploadError) throw uploadError;

      // 2. Get the public URL for the database record
      const { data: { publicUrl } } = supabase.storage
        .from('technical-drawings')
        .getPublicUrl(path);

      // 3. Create the Submission Record (The Forensic Entry)
      const { error: dbError } = await supabase
        .from('design_submissions')
        .insert([{
          project_id: projectId,
          file_url: publicUrl,
          drawing_type: drawingType,
          status: 'Pending Review',
          submission_notes: description,
          created_at: new Date().toISOString()
        }]);

      if (dbError) throw dbError;

      // 4. Update Project Status to notify the Review Team
      await supabase
        .from('projects')
        .update({ status: 'Design Phase' })
        .eq('id', projectId);

      toast.success("Technical Drawing Submitted", {
        description: "The Engineering Division has been notified for review."
      });

      setFile(null);
      setDescription("");
      onSuccess();
    } catch (err: any) {
      toast.error("Submission Failed", { description: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-slate-200 border border-slate-100 max-w-2xl mx-auto">
      <header className="mb-10 flex items-center gap-5">
        <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
          <Upload size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Submit Design</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{projectName}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Drawing Type Selector */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Document Category</label>
          <div className="grid grid-cols-2 gap-3">
            {drawingTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setDrawingType(type)}
                className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${
                  drawingType === type 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                  : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* File Dropzone */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Technical Blueprint (PDF)</label>
          <label className={`relative group flex flex-col items-center justify-center w-full h-48 border-4 border-dashed rounded-[2rem] transition-all cursor-pointer ${
            file ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200'
          }`}>
            {file ? (
              <div className="text-center animate-in zoom-in-95">
                <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-black text-slate-800 uppercase max-w-[200px] truncate">{file.name}</p>
                <button type="button" onClick={() => setFile(null)} className="text-[9px] font-black text-rose-500 uppercase mt-2 hover:underline">Remove</button>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <FileText size={32} className="text-slate-300 mx-auto group-hover:text-blue-500 transition-colors" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Click to select file</p>
              </div>
            )}
            <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
          </label>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Submission Notes</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="E.g. Revised Structural foundation based on soil test..."
            className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
          />
        </div>

        {/* Security Alert */}
        <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-4">
          <ShieldAlert className="text-orange-500 shrink-0" size={18} />
          <p className="text-[9px] font-bold text-orange-900 uppercase leading-relaxed">
            Forensic Notice: This upload is time-stamped and digitally logged. Submission of incorrect data may result in contract penalties as per the signed agreement.
          </p>
        </div>

        {/* Action Button */}
        <button 
          disabled={uploading || !file}
          className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-200 hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {uploading ? <><Loader2 className="animate-spin" size={16} /> Processing...</> : "Submit for Engineering Review"}
        </button>
      </form>
    </div>
  );
}