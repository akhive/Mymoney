export type TransactionType = "income" | "expense";
export type UserRole = "super_user" | "admin" | "user";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  job_title: string | null;
  role: UserRole;
  avatar_url: string | null;
  preferred_currency: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: "cash" | "bank" | "credit_card" | "investment" | "other";
  balance: number;
  currency: string;
  color: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
  updated_at: string;
  account?: Account;
  category?: Category;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
  category?: Category;
}
