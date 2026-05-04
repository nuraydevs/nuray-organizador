import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Project } from "@/types/database";

const TABLE = "projects";

export async function listProjects(): Promise<Project[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Project) ?? null;
}

export async function createProject(input: Partial<Project>): Promise<Project> {
  const sb = getSupabaseBrowser();
  const payload = {
    name: input.name?.trim() ?? "",
    description: input.description ?? null,
    type: input.type ?? "personal",
    status: input.status ?? "active",
    priority: input.priority ?? "medium",
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
    notes: input.notes ?? null,
  };
  const { data, error } = await sb.from(TABLE).insert(payload).select().single();
  if (error) throw error;
  return data as Project;
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

export async function deleteProject(id: string): Promise<void> {
  const sb = getSupabaseBrowser();
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
