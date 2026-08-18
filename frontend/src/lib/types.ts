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