"use server";
// import { createClient } from "@/lib/supabase/server";
import { createClient } from "./supabase/server";

export async function getDashboardStats() {
  const supabase = await createClient();

  // 1. Fetch all project data
  const { data: projects, error } = await supabase
    .from('projects')
    .select('status, sector, name, progress');

  if (error || !projects) return null;

  // 2. Aggregate Stats for Cards
  const stats = {
    total: projects.length,
    ongoing: projects.filter(p => p.status === 'Ongoing').length,
    completed: projects.filter(p => p.status === 'Completed').length,
    // Example logic for budget utilization
    budget: "72%" 
  };

  // 3. Aggregate Progress for Bar Chart (Top 5 Projects)
  const progressData = projects
    .slice(0, 5)
    .map(p => ({ name: p.name, progress: p.progress }));

  // 4. Aggregate Sectors for Pie Chart
  const sectors = ['Schools', 'Health', 'Youth', 'Libraries'];
  const sectorData = sectors.map(s => ({
    name: s,
    value: projects.filter(p => p.sector === s).length,
    fill: s === 'Schools' ? '#0B3C5D' : s === 'Health' ? '#2E8B57' : '#F4A261'
  }));

  return { stats, progressData, sectorData };
}