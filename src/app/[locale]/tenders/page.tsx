// src/app/[locale]/tenders/page.tsx

import { createClient } from "@/lib/actions/supabase/server";
import { setRequestLocale } from "next-intl/server";
import PublicTendersClient from "@/components/public/PublictendersClient";

export default async function TendersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tenders")
    .select(
      "tender_id,title,ref_no,status,submission_deadline,closing_date," +
      "budget_estimate,currency,project_type,woreda,description," +
      "evaluation_method,min_experience_years,required_documents,publication_date"
    )
    .eq("visible_to_public", true)
    .eq("status", "Open")
    .order("publication_date", { ascending: false });

  type TenderRow = {
    tender_id: string; title: string; ref_no: string; status: string;
    submission_deadline: string | null; closing_date: string | null;
    budget_estimate: number; currency: string; project_type: string;
    woreda: string; description: string | null; evaluation_method: string;
    min_experience_years: number; required_documents: string[] | null;
    publication_date: string | null;
  };

  const tenders = (error ? [] : (data ?? [])) as unknown as TenderRow[];

  return <PublicTendersClient locale={locale} tenders={tenders} />;
}