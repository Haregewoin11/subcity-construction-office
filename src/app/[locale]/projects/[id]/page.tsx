// src/app/[locale]/projects/[id]/page.tsx
// Public project detail — fetches one project with documents and photos.

import { createClient } from "@/lib/actions/supabase/server";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import PublicProjectDetailClient from "@/components/public/PublicProjectDetailClient";

const LIST_STATUSES = [
  "Ongoing",
  "Design Phase",
  "BOQ Verification",
  "Completed",
  "Planned",
] as const;

type ProjectDoc = {
  id: string;
  file_name: string;
  file_url: string;
  file_type?: string | null;
};

type ProjectPhoto = {
  id: string;
  image_url: string;
  caption?: string | null;
};

type ProjectDetailRow = {
  id: string;
  name: string;
  name_am: string | null;
  sector: string | null;
  status: string;
  progress: number | null;
  budget: number | null;
  currency: string | null;
  location: string | null;
  start_date: string | null;
  expected_end_date: string | null;
  description_en: string | null;
  description_am: string | null;
  contractor_id: string | null;
  project_documents: ProjectDoc[] | null;
  project_photos: ProjectPhoto[] | null;
};

export default async function PublicProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, name, name_am, sector, status, progress, budget, currency, " +
        "location, start_date, expected_end_date, description_en, description_am, " +
        "contractor_id, project_documents(id, file_name, file_url, file_type), " +
        "project_photos(id, image_url, caption)"
    )
    .eq("id", id)
    .in("status", [...LIST_STATUSES])
    .maybeSingle();

  if (error || !data) notFound();

  const row = data as unknown as ProjectDetailRow;

  let contractorName: string | null = null;
  if (row.contractor_id) {
    const { data: c } = await supabase
      .from("contractors")
      .select("company_name")
      .eq("id", row.contractor_id)
      .maybeSingle();
    contractorName = c?.company_name ?? null;
  }

  const project = {
    id: row.id,
    name: row.name,
    name_am: row.name_am,
    sector: row.sector,
    status: row.status,
    progress: Number(row.progress) || 0,
    budget: Number(row.budget) || 0,
    currency: row.currency || "ETB",
    location: row.location,
    start_date: row.start_date,
    expected_end_date: row.expected_end_date,
    description_en: row.description_en,
    description_am: row.description_am,
    contractor_name: contractorName,
    project_documents: row.project_documents ?? [],
    project_photos: row.project_photos ?? [],
  };

  return <PublicProjectDetailClient project={project} locale={locale} />;
}
