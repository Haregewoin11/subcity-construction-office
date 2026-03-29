// src/lib/projectLocale.ts
// ── Centralised locale-aware field resolver for the `projects` table.
// ── Use everywhere a project name or description is displayed to the public.

export type LocaleCode = "en" | "am";

type ProjectRow = {
  name: string;
  name_am?: string | null;
  description_en?: string | null;
  description_am?: string | null;
  [key: string]: any;
};

/**
 * Returns the display name for a project in the requested locale.
 * Falls back to the English name if no Amharic name is set.
 */
export function getProjectName(project: ProjectRow, locale: LocaleCode): string {
  if (locale === "am" && project.name_am) return project.name_am;
  return project.name;
}

/**
 * Returns the display description for a project in the requested locale.
 * Falls back to the English description, then to an empty string.
 */
export function getProjectDescription(project: ProjectRow, locale: LocaleCode): string {
  if (locale === "am") return project.description_am || project.description_en || "";
  return project.description_en || project.description_am || "";
}

/**
 * Returns both name and description for the requested locale in one call.
 */
export function getProjectLocalized(project: ProjectRow, locale: LocaleCode) {
  return {
    name: getProjectName(project, locale),
    description: getProjectDescription(project, locale),
    hasAmharicName: Boolean(project.name_am),
  };
}
