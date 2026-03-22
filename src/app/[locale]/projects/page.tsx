// src/app/[locale]/projects/page.tsx
// Server component — fetches projects, passes to client component

import { createClient } from "@/lib/actions/supabase/server";
import { setRequestLocale } from "next-intl/server";
import PublicProjectsClient from "@/components/public/ProjectsClient";

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

  const rows = error ? [] : (data ?? []);
  const contractorIds = [...new Set(rows.map((p: any) => p.contractor_id).filter(Boolean))];

  let contractorMap: Record<string, string> = {};
  if (contractorIds.length > 0) {
    const { data: ctcs } = await supabase
      .from("contractors")
      .select("id, company_name")
      .in("id", contractorIds as string[]);
    contractorMap = Object.fromEntries((ctcs ?? []).map((c: any) => [c.id, c.company_name]));
  }

  const projects = rows.map((p: any) => ({
    ...p,
    contractor_name: p.contractor_id ? (contractorMap[p.contractor_id] ?? null) : null,
    budget: Number(p.budget) || 0,
  }));

  return <PublicProjectsClient projects={projects} locale={locale} />;
}