import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { FinanceTransaction } from "@/types/database";

const TABLE = "finance_transactions";

export async function listTransactions(): Promise<FinanceTransaction[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FinanceTransaction[];
}

export async function getTransaction(
  id: string,
): Promise<FinanceTransaction | null> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as FinanceTransaction) ?? null;
}

export async function createTransaction(
  input: Partial<FinanceTransaction>,
): Promise<FinanceTransaction> {
  const sb = getSupabaseBrowser();
  const payload = {
    type: input.type ?? "income",
    status: input.status ?? "pending",
    amount: input.amount ?? 0,
    concept: input.concept?.trim() ?? "",
    category: input.category ?? null,
    transaction_date:
      input.transaction_date ?? new Date().toISOString().slice(0, 10),
    due_date: input.due_date ?? null,
    client_id: input.client_id ?? null,
    project_id: input.project_id ?? null,
    payment_method: input.payment_method ?? null,
    notes: input.notes ?? null,
  };
  const { data, error } = await sb.from(TABLE).insert(payload).select().single();
  if (error) throw error;
  return data as FinanceTransaction;
}

export async function updateTransaction(
  id: string,
  patch: Partial<FinanceTransaction>,
): Promise<FinanceTransaction> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as FinanceTransaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  const sb = getSupabaseBrowser();
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
