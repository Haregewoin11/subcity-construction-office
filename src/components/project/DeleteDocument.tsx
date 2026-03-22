"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProjectDocument } from "@/lib/actions/projects";

export function DeleteDocumentButton({
  documentId,
  projectId,
}: {
  documentId: string;
  projectId: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Remove this document from the project?")) return;
    setLoading(true);
    const result = await deleteProjectDocument(documentId, projectId);
    setLoading(false);
    if (result.success) {
      toast.success("Document removed.");
    } else {
      toast.error("Failed to remove document.", { description: result.error });
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
      title="Remove document"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Trash2 size={14} />
      )}
    </button>
  );
}