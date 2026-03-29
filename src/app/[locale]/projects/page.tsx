// src/app/[locale]/projects/page.tsx
import { createClient } from "@/lib/actions/supabase/server";
import { setRequestLocale } from "next-intl/server";
import PublicProjectsClient from "@/components/public/ProjectsClient";

// 1. Define the Database structure interface
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
  description_en: string | null;
  description_am: string | null;
  contractor_id: string | null;
}

interface ContractorRow {
  id: string;
  company_name: string;
}

type Props = { params: Promise<{ locale: string }> };

export default async function ProjectsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, name, name_am, sector, status, progress, budget, currency, " +
      "location, start_date, expected_end_date, description_en, description_am, " +
      "contractor_id"
    )
    .in("status", ["Ongoing", "Design Phase", "BOQ Verification", "Completed", "Planned"])
    .order("status")
    .order("progress", { ascending: false });

  // 2. Cast data to our known Row type
  const rows = (error ? [] : (data ?? [])) as unknown as ProjectRow[];

  // 3. Fix the filter typo: ensure IDs are strings before using them in the query
  const contractorIds = Array.from(
    new Set(rows.map((p) => p.contractor_id).filter((id): id is string => !!id))
  );

  let contractorMap: Record<string, string> = {};
  
  if (contractorIds.length > 0) {
    const { data: ctcs } = await supabase
      .from("contractors")
      .select("id, company_name")
      .in("id", contractorIds);

    // 4. Correctly type the contractor mapping
    contractorMap = Object.fromEntries(
      ((ctcs as unknown as ContractorRow[]) ?? []).map((c) => [c.id, c.company_name])
    );
  }

  // 5. Final mapping to the shape expected by PublicProjectsClient
  const projects = rows.map((p) => ({
    ...p,
    contractor_name: p.contractor_id ? (contractorMap[p.contractor_id] ?? null) : null,
    budget: Number(p.budget) || 0,
    progress: p.progress ?? 0, // Ensure progress is not null for the client component
    currency: p.currency ?? "ETB",
  }));

  return <PublicProjectsClient projects={projects} locale={locale} />;
}