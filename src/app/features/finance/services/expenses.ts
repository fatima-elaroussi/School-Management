import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api.config';
import {
  CreateExpensePayload,
  Expense,
  ExpenseCategory,
  ExpenseCategoryBreakdown,
  ExpenseFilters,
  ExpenseSummary,
  UpdateExpensePayload,
} from '../models/expense.model';

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = API_ENDPOINTS.expenses;

  // ─── Read ──────────────────────────────────────────────────────────────────

  /**
   * Returns all expenses, with optional server-side field filtering.
   * json-server translates query params to exact-match WHERE clauses:
   *   GET /expenses?status=en+attente&category=salaires
   */
  getExpenses(filters?: ExpenseFilters): Observable<Expense[]> {
    const params = this.buildParams(filters);
    return this.http.get<Expense[]>(this.baseUrl, { params }).pipe(
      catchError((err) => this.handleError('fetch expenses', err)),
    );
  }

  getExpenseById(id: string): Observable<Expense> {
    return this.http.get<Expense>(`${this.baseUrl}/${id}`).pipe(
      catchError((err) => this.handleError(`fetch expense ${id}`, err)),
    );
  }

  /** All expenses for a given accounting month, e.g. "2026-06". */
  getExpensesByMonth(month: string): Observable<Expense[]> {
    return this.getExpenses({ month });
  }

  /** All expenses in a specific operational category. */
  getExpensesByCategory(category: ExpenseCategory): Observable<Expense[]> {
    return this.getExpenses({ category });
  }

  /** All expenses submitted by a specific staff member (reimbursements). */
  getExpensesByStaff(submittedById: string): Observable<Expense[]> {
    return this.getExpenses({ submittedById });
  }

  /** All expenses awaiting approval / payment. */
  getPendingExpenses(): Observable<Expense[]> {
    return this.getExpenses({ status: 'en attente' });
  }

  // ─── Write ─────────────────────────────────────────────────────────────────

  createExpense(payload: CreateExpensePayload): Observable<Expense> {
    const now  = new Date().toISOString();
    const body = { ...payload, createdAt: now, updatedAt: now };
    return this.http.post<Expense>(this.baseUrl, body).pipe(
      catchError((err) => this.handleError('create expense', err)),
    );
  }

  /**
   * Partial update (PATCH) — only supplied fields are changed.
   * updatedAt is always refreshed automatically.
   */
  updateExpense(id: string, payload: UpdateExpensePayload): Observable<Expense> {
    const body = { ...payload, updatedAt: new Date().toISOString() };
    return this.http.patch<Expense>(`${this.baseUrl}/${id}`, body).pipe(
      catchError((err) => this.handleError(`update expense ${id}`, err)),
    );
  }

  /** Full replacement (PUT) — prefer updateExpense for partial edits. */
  replaceExpense(id: string, payload: CreateExpensePayload): Observable<Expense> {
    const body = { ...payload, updatedAt: new Date().toISOString() };
    return this.http.put<Expense>(`${this.baseUrl}/${id}`, body).pipe(
      catchError((err) => this.handleError(`replace expense ${id}`, err)),
    );
  }

  deleteExpense(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      catchError((err) => this.handleError(`delete expense ${id}`, err)),
    );
  }

  // ─── Finance domain shortcuts ──────────────────────────────────────────────

  /** Marks an expense as paid and stamps today as paidDate. */
  markAsPaid(
    id: string,
    method: Expense['method'],
    paidDate = new Date().toISOString().slice(0, 10),
  ): Observable<Expense> {
    return this.updateExpense(id, { status: 'payé', method, paidDate });
  }

  /** Rejects / cancels an expense. */
  reject(id: string, notes?: string): Observable<Expense> {
    return this.updateExpense(id, { status: 'rejeté', ...(notes ? { notes } : {}) });
  }

  // ─── Reporting helpers (pure, synchronous) ─────────────────────────────────

  /**
   * Computes a financial summary from an in-memory list.
   * Stateless and testable — no HTTP involved.
   */
  getSummary(expenses: Expense[]): ExpenseSummary {
    return expenses.reduce<ExpenseSummary>(
      (acc, e) => {
        acc.total++;
        acc.totalAmount += e.amount;

        switch (e.status) {
          case 'payé':
            acc.paid++;
            acc.paidAmount += e.amount;
            break;
          case 'en attente':
            acc.pending++;
            acc.pendingAmount += e.amount;
            break;
          case 'rejeté':
            acc.rejected++;
            break;
        }

        return acc;
      },
      { total: 0, paid: 0, pending: 0, rejected: 0,
        totalAmount: 0, paidAmount: 0, pendingAmount: 0 },
    );
  }

  /**
   * Breaks down a list of expenses by category with amounts and percentages.
   * Sorted descending by totalAmount — ready for charting.
   */
  getBreakdownByCategory(expenses: Expense[]): ExpenseCategoryBreakdown[] {
    const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const map        = new Map<string, ExpenseCategoryBreakdown>();

    for (const expense of expenses) {
      const entry = map.get(expense.category);
      if (entry) {
        entry.count++;
        entry.totalAmount += expense.amount;
      } else {
        map.set(expense.category, {
          category: expense.category, count: 1,
          totalAmount: expense.amount, percentage: 0,
        });
      }
    }

    return [...map.values()]
      .map((entry) => ({
        ...entry,
        percentage: grandTotal > 0
          ? Math.round((entry.totalAmount / grandTotal) * 1000) / 10
          : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /** Live summary observable for a given month. */
  getMonthlySummary(month: string): Observable<ExpenseSummary> {
    return this.getExpensesByMonth(month).pipe(
      map((expenses) => this.getSummary(expenses)),
    );
  }

  /** Live category breakdown observable for a given month. */
  getMonthlyBreakdown(month: string): Observable<ExpenseCategoryBreakdown[]> {
    return this.getExpensesByMonth(month).pipe(
      map((expenses) => this.getBreakdownByCategory(expenses)),
    );
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private buildParams(filters?: ExpenseFilters): HttpParams {
    let params = new HttpParams();
    if (!filters) return params;

    const { fromDate, toDate, ...exact } = filters;

    for (const [key, value] of Object.entries(exact)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }

    if (fromDate) params = params.set('date_gte', fromDate);
    if (toDate)   params = params.set('date_lte', toDate);

    return params;
  }

  private handleError(action: string, error: unknown): Observable<never> {
    console.error(`ExpensesService: failed to ${action}`, error);
    return throwError(() => new Error(`Failed to ${action}`));
  }
}
