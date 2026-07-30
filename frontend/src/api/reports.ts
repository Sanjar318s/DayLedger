import apiClient from './client';

export interface ReportSummary {
  total_income: number;
  total_expense: number;
  balance: number;
  by_category: { category: string; amount: number; type: string }[];
  count: number;
}

export const getReportSummary = (params: { period: string; from?: string; to?: string }) =>
  apiClient.get<ReportSummary>('/reports/summary', { params });
