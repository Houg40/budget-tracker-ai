export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface Account {
  id: number;
  user_id: number;
  name: string;
  account_type: string;
  created_at: string;
}

export interface AccountCreateInput {
  name: string;
  account_type: string;
}

export interface AccountUpdateInput {
  name?: string;
  account_type?: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Transaction {
  id: number;
  account_id: number;
  category_id: number | null;
  description: string;
  amount: string;
  transaction_date: string;
  ai_confidence: number | null;
  user_corrected: boolean;
  created_at: string;
}

export interface TransactionCreateInput {
  account_id: number;
  description: string;
  amount: number;
  transaction_date: string;
  category_id?: number | null;
}

export interface CategorySummary {
  category: string;
  total: string;
}

export interface DailySummary {
  date: string;
  total: string;
}

export interface SignupInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}