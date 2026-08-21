import {
  Category,
  Transaction,
  TransactionCreateInput,
  CategorySummary,
  DailySummary,
  User,
  Account,
  SignupInput,
  LoginInput,
} from "./types";

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

// --- Auth ---

export async function signup(input: SignupInput): Promise<User> {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<User>(res);
}

export async function login(input: LoginInput): Promise<User> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<User>(res);
}

export async function logout(): Promise<void> {
  const res = await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  return handleResponse<void>(res);
}

export async function getMe(): Promise<User> {
  const res = await fetch(`${API_URL}/auth/me`, {
    credentials: "include",
  });
  return handleResponse<User>(res);
}

// --- Accounts ---

export async function getAccounts(): Promise<Account[]> {
  const res = await fetch(`${API_URL}/accounts`, {
    credentials: "include",
  });
  return handleResponse<Account[]>(res);
}

// --- Transactions ---

export async function getTransactions(): Promise<Transaction[]> {
  const res = await fetch(`${API_URL}/transactions`, {
    credentials: "include",
  });
  return handleResponse<Transaction[]>(res);
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/categories`, {
    credentials: "include",
  });
  return handleResponse<Category[]>(res);
}

export async function createTransaction(input: TransactionCreateInput): Promise<Transaction> {
  const res = await fetch(`${API_URL}/transactions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<Transaction>(res);
}

export async function updateTransactionCategory(id: number, categoryId: number): Promise<Transaction> {
  const res = await fetch(`${API_URL}/transactions/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category_id: categoryId }),
  });
  return handleResponse<Transaction>(res);
}

export async function deleteTransaction(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/transactions/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handleResponse<void>(res);
}

export async function getCategorySummary(month?: string): Promise<CategorySummary[]> {
  const url = month
    ? `${API_URL}/transactions/summary/by-category?month=${month}`
    : `${API_URL}/transactions/summary/by-category`;
  const res = await fetch(url, { credentials: "include" });
  return handleResponse<CategorySummary[]>(res);
}

export async function getDailySummary(month?: string): Promise<DailySummary[]> {
  const url = month
    ? `${API_URL}/transactions/summary/by-date?month=${month}`
    : `${API_URL}/transactions/summary/by-date`;
  const res = await fetch(url, { credentials: "include" });
  return handleResponse<DailySummary[]>(res);
}