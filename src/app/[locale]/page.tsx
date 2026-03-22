// src/app/[locale]/page.tsx
// Server component — only responsibility: fetch data, render HomePageClient.
// All language switching lives in HomePageClient (client component).

import { createClient } from "@/lib/actions/supabase/server";
import { setRequestLocale } from "next-intl/server";
// ✅ Import path matches the actual file: src/components/public/HomePageClient.tsx
import { HomePageClient } from "@/components/public/HomePageClient";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const [
    { data: projects },
    { data: tenders },
    { data: contractors },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,sector,status,progress,budget,location,expected_end_date,contractor_name"),
    supabase
      .from("tenders")
      .select("tender_id,title,ref_no,status,submission_deadline,closing_date,budget_estimate,currency,project_type,woreda,description,evaluation_method,min_experience_years,required_documents,publication_date")
      .eq("visible_to_public", true)
      .eq("status", "Open")
      .order("publication_date", { ascending: false })
      .limit(3),
    supabase
      .from("contractors")
      .select("id")
      // .eq("is_verified", true),
  ]);

  return (
    <HomePageClient
      locale={locale}
      projects={projects ?? []}
      tenders={tenders ?? []}
      contractors={contractors ?? []}
    />
  );
}