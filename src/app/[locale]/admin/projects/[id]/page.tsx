// src/app/[locale]/admin/projects/[id]/page.tsx
// ── LOCALIZED: all hardcoded strings replaced with getTranslations("Admin.projects_module")
// ── SERVER COMPONENT — uses getTranslations (not useTranslations)

import { createClient } from "@/lib/actions/supabase/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  FileText, Image as ImageIcon, MapPin, DollarSign,
  Calendar, HardHat, Clock, Edit3, ArrowLeft,
  FileImage, FileArchive, FolderOpen, Camera, PlayCircle,
} from "lucide-react";

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  "Planned":          { bg: "bg-sky-100",     text: "text-sky-700",      dot: "bg-sky-400"      },
  "Design Phase":     { bg: "bg-purple-100",  text: "text-purple-700",   dot: "bg-purple-500"   },
  "BOQ Verification": { bg: "bg-amber-100",   text: "text-amber-700",    dot: "bg-amber-500"    },
  "Ongoing":          { bg: "bg-emerald-100", text: "text-emerald-700",  dot: "bg-emerald-500"  },
  "On Hold":          { bg: "bg-red-100",     text: "text-red-700",      dot: "bg-red-500"      },
  "Completed":        { bg: "bg-blue-100",    text: "text-blue-700",     dot: "bg-blue-500"     },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status || "Unknown"}
    </span>
  );
}

function DocIcon({ fileType }: { fileType?: string }) {
  const type = fileType?.toLowerCase() ?? "";
  if (type.includes("image"))                         return <FileImage size={16} />;
  if (type.includes("zip") || type.includes("rar"))  return <FileArchive size={16} />;
  if (type.includes("video"))                         return <PlayCircle size={16} />;
  return <FileText size={16} />;
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-300 gap-3">
      <div className="p-4 bg-slate-50 rounded-2xl">{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
    </div>
  );
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;
  const t = await getTranslations("Admin.projects_module");
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select(`*, project_documents(*), project_photos(*)`)
    .eq("id", id)
    .single();

  if (!project) notFound();

  const progressWidth = `${project.progress || 0}%`;
  const docs   = project.project_documents ?? [];
  const photos = project.project_photos    ?? [];

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-6 pb-20">

        {/* TOP NAVIGATION */}
        <div className="flex items-center justify-between">
          <Link href="/admin/projects"
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#0A1628] transition-colors uppercase tracking-widest">
            <ArrowLeft size={16} /> {t("back")}
          </Link>
          <Link href={`/admin/projects?edit=${id}`}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0A1628] text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95">
            <Edit3 size={18} />
            <span className="uppercase tracking-widest text-xs">{t("edit")}</span>
          </Link>
        </div>

        {/* SECTION 1: Identity Header */}
        <div className="bg-[#E85D1A] text-white p-8 rounded-3xl shadow-xl relative overflow-hidden border border-white/10">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="bg-[#0A1628] px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                {project.sector}
              </span>
              <StatusBadge status={project.status} />
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight mb-1 leading-none">
              {locale === "am" && project.name_am ? project.name_am : project.name}
            </h1>
            {project.name_am && locale !== "am" && (
              <p className="text-white/60 text-lg font-amharic mt-1">{project.name_am}</p>
            )}
            {!project.name_am && (
              <p className="text-white/40 text-xs uppercase tracking-widest mt-2 font-bold">
                {t("name_am_missing")}
              </p>
            )}
          </div>
        </div>

        {/* SECTION 2: Forensic Info Grid */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6">
            <InfoItem icon={<MapPin className="text-amber-400" />}     label={t("label_location")}   value={project.location || t("unknown_location")} />
            <InfoItem icon={<DollarSign className="text-amber-400" />} label={t("label_budget")}     value={`${project.currency} ${project.budget?.toLocaleString()}`} />
            <InfoItem icon={<HardHat className="text-amber-400" />}    label={t("label_advisor")}    value={project.advisor || t("unassigned")} />
            <InfoItem icon={<Calendar className="text-amber-400" />}   label={t("label_start")}      value={project.start_date ? new Date(project.start_date).toLocaleDateString() : t("pending_date")} />
            <InfoItem icon={<Calendar className="text-amber-400" />}   label={t("label_completion")} value={project.expected_end_date ? new Date(project.expected_end_date).toLocaleDateString() : t("pending_date")} />
            <InfoItem icon={<Clock className="text-amber-400" />}      label={t("label_entry")}      value={new Date(project.created_at).toLocaleDateString()} />
          </div>

          <div className="mt-10 pt-10 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3">
                {t("label_scope_en")}
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {project.description_en || t("no_en_desc")}
              </p>
            </div>
            <div>
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3 font-amharic">
                {t("label_scope_am")}
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed font-amharic">
                {project.description_am || t("no_am_desc")}
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 3: Progress Bar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <div className="flex justify-between items-end mb-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{t("progress_title")}</h3>
              <p className="text-[10px] text-slate-900 font-medium uppercase">{t("progress_subtitle")}</p>
            </div>
            <span className="text-4xl font-black text-[#0A1628] tracking-tighter">{progressWidth}</span>
          </div>
          <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-1">
            <div className="h-full bg-[#0A1628] rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(14,27,56,0.3)]"
              style={{ width: progressWidth }} />
          </div>
        </div>

        {/* SECTION 4 & 5: Documents + Photos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Documents */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <FileText className="text-[#0A1628]" size={20} />
                <h3 className="text-sm font-bold uppercase text-slate-900">{t("docs_title")}</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                {docs.length} {docs.length === 1 ? t("file_singular") : t("file_plural")}
              </span>
            </div>
            {docs.length === 0 ? (
              <EmptyState icon={<FolderOpen size={28} className="text-slate-300" />} label={t("no_docs")} />
            ) : (
              <div className="space-y-3">
                {docs.map((doc: any) => (
                  <a key={doc.id} href={doc.file_url} target="_blank" rel="noreferrer"
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:border-[#0A1628] border border-transparent transition-all group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-white rounded-lg group-hover:bg-[#0A1628] group-hover:text-white transition-colors shrink-0">
                        <DocIcon fileType={doc.file_type} />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-bold text-slate-900 truncate max-w-[150px]">{doc.file_name}</span>
                        {doc.file_type && (
                          <span className="text-[9px] text-slate-400 uppercase font-bold">
                            {doc.file_type.split("/")[1] ?? doc.file_type}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-[#0A1628] uppercase shrink-0">{t("download")}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Site Photos */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="text-[#0A1628]" size={20} />
                <h3 className="text-sm font-bold uppercase text-slate-900">{t("photos_title")}</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                {photos.length} {photos.length === 1 ? t("photo_singular") : t("photo_plural")}
              </span>
            </div>
            {photos.length === 0 ? (
              <EmptyState icon={<Camera size={28} className="text-slate-300" />} label={t("no_photos")} />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo: any) => (
                  <a key={photo.id} href={photo.image_url} target="_blank" rel="noreferrer"
                    className="aspect-square rounded-xl overflow-hidden border border-slate-100 relative group bg-slate-100">
                    <img src={photo.image_url} alt={photo.caption || "Site photo"}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    {photo.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[8px] font-bold px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {photo.caption}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-800">{value}</span>
    </div>
  );
}