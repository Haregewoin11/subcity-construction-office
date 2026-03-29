"use server";

import { createClient } from "./supabase/server";
import { revalidatePath } from "next/cache";

// 1. Define types for better forensic integrity
interface ProjectData {
  name: string;
  sector: string;
  status: string;
  progress: number;
  budget: number;
  location: string;
  currency: string;
  description_am: string;
  description_en: string;
  advisor: string;
  start_date: string | null;
  expected_end_date: string | null;
  updated_at: string;
}

interface FileRecord {
  name: string;
  url: string;
  type: string;
}

/**
 * Handles both the creation of new projects and updates.
 */
export async function saveProject(formData: FormData, projectId?: string) {
  const supabase = await createClient();

  const rawProgress = formData.get("progress") as string;
  const rawBudget = formData.get("budget") as string;

  const projectData: ProjectData = {
    name: formData.get("name") as string,
    sector: formData.get("sector") as string,
    status: formData.get("status") as string,
    progress: rawProgress ? parseInt(rawProgress, 10) : 0,
    budget: rawBudget ? parseFloat(rawBudget) : 0,
    location: formData.get("location") as string,
    currency: (formData.get("currency") as string) || "ETB",
    description_am: formData.get("description_am") as string,
    description_en: formData.get("description_en") as string,
    advisor: formData.get("advisor") as string,
    start_date: (formData.get("start_date") as string) || null,
    expected_end_date: (formData.get("expected_end_date") as string) || null,
    updated_at: new Date().toISOString(),
  };

  try {
    let finalId = projectId;

    if (projectId) {
      const { error } = await supabase
        .from("projects")
        .update(projectData)
        .eq("id", projectId);

      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("projects")
        .insert([projectData])
        .select("id") // Only select ID for the return
        .single();

      if (error) throw error;
      finalId = data.id;
    }

    revalidatePath("/", "layout");
    revalidatePath("/admin/projects", "page");
    if (finalId) {
        revalidatePath(`/admin/projects/${finalId}`, "page");
        revalidatePath(`/admin/projects/edit/${finalId}`, "page");
    }

    return { success: true, id: finalId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected database error occurred.";
    console.error("Forensic Audit Error - Project Action:", message);
    return { success: false, error: message };
  }
}

export async function deleteProject(id: string) {
  try {
    const supabase = await createClient();
    if (!id) return { success: false, error: "Invalid Project ID" };

    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/admin/projects");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error occurred";
    console.error("Critical Delete Failure:", message);
    return { success: false, error: message };
  }
}

export async function linkProjectFiles(
  projectId: string,
  files: FileRecord[]
) {
  if (!projectId) return { success: false, error: "Missing Project ID" };

  const supabase = await createClient();

  const documentRecords = files.map((file) => ({
    project_id: projectId,
    file_name: file.name,
    file_url: file.url,
    file_type: file.type,
  }));

  const { error } = await supabase
    .from("project_documents")
    .insert(documentRecords);

  if (error) {
    console.error("Failed to link documents:", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteProjectDocument(documentId: string, projectId: string) {
  if (!documentId) return { success: false, error: "Missing document ID" };

  const supabase = await createClient();

  const { data: doc, error: fetchError } = await supabase
    .from("project_documents")
    .select("file_url, file_name")
    .eq("id", documentId)
    .single();

  if (fetchError || !doc) return { success: false, error: "Document not found" };

  try {
    const url = new URL(doc.file_url);
    const pathParts = url.pathname.split("/project-documents/");
    if (pathParts[1]) {
      await supabase.storage
        .from("project-documents")
        .remove([decodeURIComponent(pathParts[1])]);
    }
  } catch (e: unknown) {
    console.warn("Storage file removal failed, continuing with DB cleanup.");
  }

  const { error: deleteError } = await supabase
    .from("project_documents")
    .delete()
    .eq("id", documentId);

  if (deleteError) return { success: false, error: deleteError.message };

  revalidatePath(`/admin/projects/${projectId}/edit`);
  revalidatePath(`/admin/projects/${projectId}`);

  return { success: true };
}