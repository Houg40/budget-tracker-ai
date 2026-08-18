import { Category, Transaction, TransactionCreateInput } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.detail
      ? JSON.stringify(body.detail)
      : `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

export async function getTransactions(): Promise<Transaction[]> {
  const res = await fetch(`${API_URL}/transactions`);
  return handleResponse<Transaction[]>(res);
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/categories`);
  return handleResponse<Category[]>(res);
}

export async function createTransaction(input: TransactionCreateInput): Promise<Transaction> {
  const res = await fetch(`${API_URL}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<Transaction>(res);
}

export async function updateTransactionCategory(id: number, categoryId: number): Promise<Transaction> {
  const res = await fetch(`${API_URL}/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category_id: categoryId }),
  });
  return handleResponse<Transaction>(res);
}

export async function deleteTransaction(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/transactions/${id}`, { method: "DELETE" });
  return handleResponse<void>(res);
}