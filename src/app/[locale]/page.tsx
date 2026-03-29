// src/app/[locale]/page.tsx
// Server component — only responsibility: fetch data, render HomePageClient.
// All language switching lives in HomePageClient (client component).

import { createClient } from "@/lib/actions/supabase/server";
import { setRequestLocale } from "next-intl/server";
import { HomePageClient } from "@/components/public/HomePageClient";

interface ProjectRow {
  id: string;
  name: string;
  name_am: string | null;
  sector: string | null;
  status: string;
  progress: number | null;
  budget: string | number | null;
  currency: string | null;
  location: string | null;
  start_date: string | null;
  expected_end_date: string | null;
  contractor_id: string | null;
}

interface ContractorRow {
  id: string;
  company_name: string;
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const [
    { data: rawProjects, error: projError },
    { data: tenders },
    { data: news },
    { data: contractors },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, name, name_am, sector, status, progress, budget, currency, " +
          "location, start_date, expected_end_date, contractor_id"
      )
      .in("status", [
        "Ongoing",
        "Design Phase",
        "BOQ Verification",
        "Completed",
        "Planned",
      ])
      .order("status")
      .order("progress", { ascending: false }),
    supabase
      .from("tenders")
      .select(
        "tender_id,title,ref_no,status,submission_deadline,closing_date,budget_estimate,currency,project_type,woreda,description,evaluation_method,min_experience_years,required_documents,publication_date"
      )
      .eq("visible_to_public", true)
      .eq("status", "Open")
      .order("publication_date", { ascending: false })
      .limit(3),
      supabase
      .from("news_announcements")
      .select("id,tag_en,tag_am,title_en,title_am,body_en,body_am,published_date,display_order")
      .eq("is_published", true)
      .order("display_order", { ascending: true })
      .order("published_date", { ascending: false })
      .limit(3),
    supabase.from("contractors").select("id"),
    
  ]);

  const rows = (projError ? [] : (rawProjects ?? [])) as unknown as ProjectRow[];

  const contractorIds = Array.from(
    new Set(rows.map((p) => p.contractor_id).filter((id): id is string => !!id))
  );

  let contractorMap: Record<string, string> = {};
  if (contractorIds.length > 0) {
    const { data: ctcs } = await supabase
      .from("contractors")
      .select("id, company_name")
      .in("id", contractorIds);

    contractorMap = Object.fromEntries(
      ((ctcs as unknown as ContractorRow[]) ?? []).map((c) => [c.id, c.company_name])
    );
  }

  const projects = rows.map((p) => ({
    id: p.id,
    name: p.name,
    name_am: p.name_am,
    sector: p.sector,
    status: p.status,
    progress: p.progress ?? 0,
    budget: Number(p.budget) || 0,
    currency: p.currency ?? "ETB",
    location: p.location,
    expected_end_date: p.expected_end_date,
    contractor_name: p.contractor_id ? (contractorMap[p.contractor_id] ?? null) : null,
  }));

  return (
    <HomePageClient
      locale={locale}
      projects={projects}
      tenders={tenders ?? []}
      contractors={contractors ?? []}
      news={news ?? []}
    />
  );
}
