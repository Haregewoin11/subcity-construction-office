// src/app/[locale]/tenders/[id]/page.tsx
import { createClient } from "@/lib/actions/supabase/server";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import TenderDetailClient from "@/components/public/Tendersdetailclient";

type TenderRow = {
  tender_id: string; ref_no: string; title: string; description: string | null;
  project_type: string; woreda: string; budget_estimate: number; currency: string;
  status: string; submission_deadline: string; closing_date: string | null;
  publication_date: string | null; evaluation_method: string;
  min_experience_years: number; required_documents: string[] | null;
  document_url: string | null; visible_to_public: boolean;
};

export default async function TenderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenders")
    .select(
      "tender_id,ref_no,title,description,project_type,woreda,budget_estimate," +
      "currency,status,submission_deadline,closing_date,publication_date," +
      "evaluation_method,min_experience_years,required_documents," +
      "document_url,visible_to_public"
    )
    .eq("tender_id", id)
    .eq("visible_to_public", true)
    .eq("status", "Open")
    .single();

  if (error || !data) notFound();

  const tender = data as unknown as TenderRow;

  return <TenderDetailClient locale={locale} tender={tender} />;
}