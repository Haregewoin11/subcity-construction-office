"use client";

import { useState } from "react";
import { createClient } from "@/lib/actions/supabase/clients";
import { linkProjectFiles } from "@/lib/actions/projects";
import { FileUp, X, CheckCircle2, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

type ProjectFile = {
  name: string;
  url: string;
  type: string;
};

interface FileUploadProps {
  projectId: string;
  onUploadComplete?: () => void;
}
export function FileUpload({ projectId, onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<ProjectFile[]>([]);
  
  // Initialize client once
  const supabase = createClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUploads: ProjectFile[] = []; // Explicitly typed array

    for (const file of Array.from(files)) {
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`; // More forensic than Math.random()
        const filePath = `${projectId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("project-documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("project-documents")
          .getPublicUrl(filePath);

        const fileData: ProjectFile = {
          name: file.name,
          url: publicUrl,
          type: file.type,
        };

        await linkProjectFiles(projectId, [fileData]);
        newUploads.push(fileData);
        toast.success(`${file.name} secured.`);
        
      } catch (error) {
        // Safe error handling
        const errorMessage = error instanceof Error ? error.message : "Storage connection failed";
        toast.error(`Upload failed for ${file.name}: ${errorMessage}`);
      }
    }

    setUploadedFiles((prev) => [...prev, ...newUploads]);
    setUploading(false);
    if (onUploadComplete) onUploadComplete();
  };

  return (
    <div className="space-y-6">
      {/* Upload Dropzone */}
      <div className="relative border-2 border-dashed border-slate-200 rounded-3xl p-10 hover:border-gov-blue hover:bg-blue-50/30 transition-all text-center group">
        <input 
          type="file" 
          multiple 
          onChange={handleUpload}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
        />
        
        <div className="flex flex-col items-center">
          <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
            {uploading ? (
              <Loader2 className="animate-spin text-gov-blue" size={32} />
            ) : (
              <FileUp className="text-gov-blue" size={32} />
            )}
          </div>
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
            {uploading ? "Securing Evidence..." : "Upload Site Evidence"}
          </h4>
          <p className="text-[10px] text-slate-400 uppercase mt-1 font-bold">
            Drag & drop forensic documents or site photos
          </p>
        </div>
      </div>

      {/* Real-time File List */}
      {uploadedFiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
          {uploadedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-slate-50 rounded-lg text-gov-blue">
                  {file.type.includes("image") ? <ImageIcon size={16} /> : <FileText size={16} />}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-bold text-slate-700 truncate w-32 md:w-48">{file.name}</span>
                  <span className="text-[9px] text-emerald-600 font-black uppercase flex items-center gap-1">
                    <CheckCircle2 size={10} /> Verified Upload
                  </span>
                </div>
              </div>
              <a href={file.url} target="_blank" className="text-[9px] font-black text-slate-400 hover:text-gov-blue uppercase tracking-tighter mr-2">
                View
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}