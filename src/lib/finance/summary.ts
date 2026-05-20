import type { FinanceTransaction } from "@/types/database";
import { parseDateOnly, startOfToday } from "@/lib/utils/dates";

export interface FinanceSummary {
  incomeConfirmed: number;
  expenseConfirmed: number;
  net: number;
  incomePending: number;
  expensePending: number;
  margin: number | null;
}

export function isOverdue(tx: FinanceTransaction, today = startOfToday()): boolean {
  if (tx.status !== "pending" || !tx.due_date) return false;
  const due = parseDateOnly(tx.due_date);
  if (!due) return false;
  return due.getTime() < today.getTime();
}

/** Aggregates a list of transactions into confirmed/pending totals and net. */
export function summarize(txs: FinanceTransaction[]): FinanceSummary {
  let incomeConfirmed = 0;
  let expenseConfirmed = 0;
  let incomePending = 0;
  let expensePending = 0;

  for (const tx of txs) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === "income") {
      if (tx.status === "confirmed") incomeConfirmed += amount;
      else incomePending += amount;
    } else {
      if (tx.status === "confirmed") expenseConfirmed += amount;
      else expensePending += amount;
    }
  }

  const net = incomeConfirmed - expenseConfirmed;
  const margin = incomeConfirmed > 0 ? (net / incomeConfirmed) * 100 : null;

  return {
    incomeConfirmed,
    expenseConfirmed,
    net,
    incomePending,
    expensePending,
    margin,
  };
}

export function inMonth(
  dateStr: string | null | undefined,
  year: number,
  month: number,
): boolean {
  const d = parseDateOnly(dateStr);
  if (!d) return false;
  return d.getFullYear() === year && d.getMonth() === month;
}
