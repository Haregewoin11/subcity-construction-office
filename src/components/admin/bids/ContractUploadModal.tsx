"use client";

import React, { useState } from "react";
import { 
  X, UploadCloud, FileCheck, Loader2, 
  ShieldCheck, AlertCircle, FileText 
} from "lucide-react";
import { createClient } from "@/lib/actions/supabase/clients";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bidId: string;
  contractorName: string;
  onSuccess: () => void;
}

export default function ContractUploadModal({ isOpen, onClose, bidId, contractorName, onSuccess }: Props) {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a signed document");
    
    setUploading(true);
    try {
      // 1. Forensic Naming Convention: bid_id + timestamp
      const fileExt = file.name.split('.').pop();
      const fileName = `contracts/${bidId}_${Date.now()}.${fileExt}`;

      // 2. Upload to Private Bucket (Audit-Safe)
      const { data, error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 3. Get Public/Signed URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-documents')
        .getPublicUrl(fileName);

      // 4. Update Bid Table with Legal Link
      const { error: dbError } = await supabase
        .from('bids')
        .update({ 
          contract_document_url: publicUrl,
          contract_status: 'Signed',
          status: 'Approved' 
        })
        .eq('id', bidId);

      if (dbError) throw dbError;

      toast.success("Contract Archived", {
        description: `Signed document for ${contractorName} is now legally bound.`
      });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Forensic Archival Failed", { description: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
        
        {/* MODAL HEADER */}
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Legal Finalization</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attaching Signed Contract for {contractorName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-rose-500">
            <X size={20} />
          </button>
        </div>

        {/* UPLOAD AREA */}
        <div className="p-10 space-y-8">
          <label className="group relative flex flex-col items-center justify-center w-full h-64 border-4 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50 hover:bg-blue-50/30 hover:border-blue-200 transition-all cursor-pointer overflow-hidden">
            {file ? (
              <div className="flex flex-col items-center gap-3 animate-in zoom-in-95">
                <FileCheck size={48} className="text-emerald-500" />
                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{file.name}</p>
                <button type="button" onClick={(e) => {e.preventDefault(); setFile(null);}} className="text-[9px] font-black text-rose-500 uppercase hover:underline">Change File</button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-5 bg-white rounded-3xl shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                  <UploadCloud size={32} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Drop Signed Document</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">PDF or Scanned Images (Max 10MB)</p>
                </div>
              </div>
            )}
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>

          <div className="bg-orange-50 p-4 rounded-2xl flex gap-4 border border-orange-100">
            <AlertCircle className="text-orange-600 shrink-0" size={18} />
            <p className="text-[9px] font-bold text-orange-900 uppercase leading-relaxed">
              Forensic Note: Once uploaded, this document serves as the legal source of truth for the project's financial disbursement. Ensure all signatures are legible.
            </p>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 transition-all"
          >
            Cancel
          </button>
          <button 
            disabled={uploading || !file}
            onClick={handleUpload}
            className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-slate-900 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {uploading ? <><Loader2 className="animate-spin" size={16}/> Securing...</> : <><FileText size={16}/> Commit Document</>}
          </button>
        </div>
      </div>
    </div>
  );
}