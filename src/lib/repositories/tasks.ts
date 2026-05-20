import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Task, TaskChecklistItem } from "@/types/database";

const TASKS = "tasks";
const ITEMS = "task_checklist_items";

export async function listTasks(): Promise<Task[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TASKS)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function createTask(input: Partial<Task>): Promise<Task> {
  const sb = getSupabaseBrowser();
  const payload = {
    title: input.title?.trim() ?? "",
    description: input.description ?? null,
    status: input.status ?? "pending",
    priority: input.priority ?? "medium",
    due_date: input.due_date ?? null,
    client_id: input.client_id ?? null,
    project_id: input.project_id ?? null,
    assignee: input.assignee ?? null,
    tags: input.tags ?? [],
  };
  const { data, error } = await sb.from(TASKS).insert(payload).select().single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<Task> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TASKS)
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  const sb = getSupabaseBrowser();
  const { error } = await sb.from(TASKS).delete().eq("id", id);
  if (error) throw error;
}

export async function listChecklist(taskId: string): Promise<TaskChecklistItem[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(ITEMS)
    .select("*")
    .eq("task_id", taskId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TaskChecklistItem[];
}

export async function addChecklistItem(
  taskId: string,
  title: string,
  position: number,
): Promise<TaskChecklistItem> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(ITEMS)
    .insert({ task_id: taskId, title: title.trim(), position })
    .select()
    .single();
  if (error) throw error;
  return data as TaskChecklistItem;
}

export async function updateChecklistItem(
  id: string,
  patch: Partial<TaskChecklistItem>,
): Promise<TaskChecklistItem> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(ITEMS)
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as TaskChecklistItem;
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const sb = getSupabaseBrowser();
  const { error } = await sb.from(ITEMS).delete().eq("id", id);
  if (error) throw error;
}
