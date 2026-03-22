// src/app/[locale]/admin/service-requests/page.tsx

import ServiceRequestsDashboard from "@/components/admin/Servicerequest";

export const metadata = {
  title: "Service Requests | Admin — Lemi Kura",
};

export default function ServiceRequestsPage() {
  return <ServiceRequestsDashboard />;
}