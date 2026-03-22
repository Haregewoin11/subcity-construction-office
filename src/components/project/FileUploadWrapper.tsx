"use client";

import { FileUpload } from "@/components/admin/FileUpload";
import { useRouter } from "next/navigation";

export function FileUploadWrapper({ projectId }: { projectId: string }) {
  const router = useRouter();

  return (
    <FileUpload
      projectId={projectId}
      onUploadComplete={() => router.refresh()}
    />
  );
}