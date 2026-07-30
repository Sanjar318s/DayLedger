import apiClient from './client';

export interface Transaction {
  id: string;
  amount: number;
  type: 'expense' | 'income';
  category?: string;
  occurred_at: string;
  note?: string;
  entry_id?: string;
}

export const getTransactions = (params: { from?: string; to?: string; category?: string }) =>
  apiClient.get<Transaction[]>('/transactions', { params });

export const createTransaction = (data: Partial<Transaction>) =>
  apiClient.post<Transaction>('/transactions', data);
