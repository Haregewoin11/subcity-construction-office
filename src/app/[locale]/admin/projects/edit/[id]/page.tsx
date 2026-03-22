// src/app/[locale]/admin/projects/[id]/edit/page.tsx
// ── LOCALIZED: all hardcoded strings replaced with getTranslations("Admin.projects_module")
// ── SERVER COMPONENT

import { createClient } from "@/lib/actions/supabase/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { EditProjectForm } from "@/components/admin/EditProjectForm";
import { DeleteDocumentButton } from "@/components/project/DeleteDocumentButton";
import { FileUploadWrapper } from "@/components/project/FileUploadWrapper";
import { ShieldAlert, ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id } = await params;
  const t = await getTranslations("Admin.projects_module");
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select(`*, project_documents(*)`)
    .eq("id", id)
    .single();

  if (!project || error) notFound();

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">

        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link href={`/admin/projects/${id}`}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#0A1628] transition-colors uppercase tracking-widest">
            <ArrowLeft size={16} /> {t("back_to_detail")}
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full">
            <ShieldAlert size={14} />
            <span className="text-[10px] font-bold uppercase">{t("modification_mode")}</span>
          </div>
        </div>

        <header>
          <h1 className="text-3xl font-black text-[#0A1628] uppercase tracking-tight">{t("edit_title")}</h1>
          <p className="text-slate-500 text-sm">
            {t("edit_subtitle")}{" "}
            <span className="font-mono text-slate-700">{project.name}</span>
          </p>
        </header>

        {/* Project Fields Form */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <EditProjectForm project={project} />
        </div>

        {/* Document Management Section */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="text-[#0A1628]" size={20} />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">
                {t("doc_mgmt_title")}
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
              {project.project_documents?.length ?? 0} {t("doc_files")}
            </span>
          </div>

          <ExistingDocuments
            projectId={id}
            documents={project.project_documents ?? []}
            viewLabel={t("view")}
            noDocsLabel={t("no_docs_uploaded")}
          />

          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              {t("upload_additional")}
            </p>
            <FileUploadWrapper projectId={id} />
          </div>
        </div>
      </div>
    </>
  );
}

function ExistingDocuments({
  projectId, documents, viewLabel, noDocsLabel,
}: {
  projectId: string;
  documents: any[];
  viewLabel: string;
  noDocsLabel: string;
}) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-300 gap-2">
        <FileText size={28} />
        <p className="text-[10px] font-black uppercase tracking-widest">{noDocsLabel}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {documents.map((doc: any) => (
        <div key={doc.id}
          className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl group hover:border-slate-200 transition-all">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-white rounded-lg border border-slate-100">
              <FileText size={16} className="text-[#0A1628]" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">{doc.file_name}</span>
              {doc.file_type && (
                <span className="text-[9px] text-slate-400 uppercase font-bold">
                  {doc.file_type.split("/")[1] ?? doc.file_type}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a href={doc.file_url} target="_blank" rel="noreferrer"
              className="text-[9px] font-black text-[#0A1628] uppercase hover:underline">
              {viewLabel}
            </a>
            <DeleteDocumentButton documentId={doc.id} projectId={projectId} />
          </div>
        </div>
      ))}
    </div>
  );
}