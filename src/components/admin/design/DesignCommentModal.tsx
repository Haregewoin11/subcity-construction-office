"use client";
import React, { useState } from "react";
import { MessageSquare, X, Send } from "lucide-react";

// 1. Define the Submission interface
interface DesignSubmission {
  id: string;
  project_title: string;
  drawing_type: string;
}

// 2. Define the Props interface
interface DesignCommentModalProps {
  submission: DesignSubmission;
  onClose: () => void;
  onSave: (submissionId: string, comment: string) => void;
}

export function DesignCommentModal({ 
  submission, 
  onClose, 
  onSave 
}: DesignCommentModalProps) { // 3. Apply the interface here
  const [comment, setComment] = useState("");

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="p-8 bg-[#0B3C5D] text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <MessageSquare size={20} className="text-amber-400" />
            <h3 className="font-black uppercase text-xs tracking-widest italic">Technical Revision Note</h3>
          </div>
          <button 
            onClick={onClose} 
            className="hover:rotate-90 transition-all opacity-70 hover:opacity-100"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-8 space-y-6">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Document</p>
            <p className="text-sm font-black text-slate-800 uppercase">
              {submission.project_title} — {submission.drawing_type}
            </p>
          </div>

          <textarea 
            className="w-full h-40 p-6 bg-slate-50 rounded-[2rem] border-2 border-transparent focus:border-blue-500 outline-none font-medium text-slate-700 transition-all resize-none shadow-inner placeholder:text-slate-300"
            placeholder="Specify technical deficiencies or approval conditions..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <button 
            onClick={() => onSave(submission.id, comment)}
            disabled={!comment.trim()} // Prevents empty forensic notes
            className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} /> Commit Note to Ledger
          </button>
        </div>
      </div>
    </div>
  );
}