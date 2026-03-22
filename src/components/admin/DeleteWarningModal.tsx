"use client";

import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectName: string;
  isDeleting: boolean;
}

export function DeleteWarningModal({ isOpen, onClose, onConfirm, projectName, isDeleting }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        
        {/* Header - Danger Zone */}
        <div className="bg-red-50 p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight"> caution</h2>
          <p className="text-xs text-red-600 font-bold uppercase tracking-widest mt-1">Permanent Deletion Requested</p>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <p className="text-sm text-slate-500 mb-6">
            You are about to remove <span className="font-bold text-slate-900 underline">"{projectName}"</span> from the  project registry. This will destroy all links, documents, and logs associated with this ID.
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Trash2 size={18} />
                  <span>Confirm </span>
                </>
              )}
            </button>
            
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancel 
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}