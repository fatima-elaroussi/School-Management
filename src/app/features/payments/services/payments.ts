import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  catchError,
  map,
  throwError,
} from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api.config';
import {
  CreatePaymentPayload,
  Payment,
  PaymentFilters,
  PaymentSummary,
  UpdatePaymentPayload,
} from '../models/payment.model';

@Injectable({
  providedIn: 'root',
})
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = API_ENDPOINTS.payments;

  // ─── Read ──────────────────────────────────────────────────────────────────

  /**
   * Returns all payments, with optional server-side filtering via query params.
   * json-server supports filtering by any field: GET /payments?status=payé
   */
  getPayments(filters?: PaymentFilters): Observable<Payment[]> {
    const params = this.buildParams(filters);
    return this.http.get<Payment[]>(this.baseUrl, { params }).pipe(
      catchError((err) => this.handleError('fetch payments', err)),
    );
  }

  getPaymentById(id: string): Observable<Payment> {
    return this.http.get<Payment>(`${this.baseUrl}/${id}`).pipe(
      catchError((err) => this.handleError(`fetch payment ${id}`, err)),
    );
  }

  /**
   * Returns all payments for a specific student.
   * Equivalent to GET /payments?studentId=<id>
   */
  getPaymentsByStudent(studentId: string): Observable<Payment[]> {
    return this.getPayments({ studentId });
  }

  /**
   * Returns all payments for a specific group.
   * Equivalent to GET /payments?groupId=<id>
   */
  getPaymentsByGroup(groupId: string): Observable<Payment[]> {
    return this.getPayments({ groupId });
  }

  /**
   * Returns payments due in a given month (format: "YYYY-MM").
   */
  getPaymentsByMonth(month: string): Observable<Payment[]> {
    return this.getPayments({ month });
  }

  // ─── Write ─────────────────────────────────────────────────────────────────

  createPayment(payload: CreatePaymentPayload): Observable<Payment> {
    const body = {
      ...payload,
      createdAt: new Date().toISOString(),
    };

    return this.http.post<Payment>(this.baseUrl, body).pipe(
      catchError((err) => this.handleError('create payment', err)),
    );
  }

  updatePayment(id: string, payload: UpdatePaymentPayload): Observable<Payment> {
    return this.http.patch<Payment>(`${this.baseUrl}/${id}`, payload).pipe(
      catchError((err) => this.handleError(`update payment ${id}`, err)),
    );
  }

  /**
   * Full replacement — prefer updatePayment (PATCH) for partial edits.
   */
  replacePayment(id: string, payload: CreatePaymentPayload): Observable<Payment> {
    return this.http.put<Payment>(`${this.baseUrl}/${id}`, payload).pipe(
      catchError((err) => this.handleError(`replace payment ${id}`, err)),
    );
  }

  deletePayment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      catchError((err) => this.handleError(`delete payment ${id}`, err)),
    );
  }

  // ─── Finance helpers ───────────────────────────────────────────────────────

  /**
   * Marks a payment as paid and records today as the paid date.
   */
  markAsPaid(
    id: string,
    method: Payment['method'],
    paidDate = new Date().toISOString().slice(0, 10),
  ): Observable<Payment> {
    return this.updatePayment(id, { status: 'payé', method, paidDate });
  }

  /**
   * Marks a payment as overdue.
   */
  markAsOverdue(id: string): Observable<Payment> {
    return this.updatePayment(id, { status: 'en retard' });
  }

  /**
   * Client-side aggregation — computes a financial summary from a payment list.
   */
  getSummary(payments: Payment[]): PaymentSummary {
    return payments.reduce<PaymentSummary>(
      (acc, p) => {
        acc.total++;
        acc.totalAmount += p.amount;

        switch (p.status) {
          case 'payé':
            acc.paid++;
            acc.collectedAmount += p.amount;
            break;
          case 'en attente':
            acc.pending++;
            acc.pendingAmount += p.amount;
            break;
          case 'en retard':
            acc.overdue++;
            acc.pendingAmount += p.amount;
            break;
        }

        return acc;
      },
      {
        total: 0,
        paid: 0,
        pending: 0,
        overdue: 0,
        totalAmount: 0,
        collectedAmount: 0,
        pendingAmount: 0,
      },
    );
  }

  /**
   * Returns a live summary observable for a given student.
   */
  getStudentSummary(studentId: string): Observable<PaymentSummary> {
    return this.getPaymentsByStudent(studentId).pipe(
      map((payments) => this.getSummary(payments)),
    );
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /**
   * Converts a PaymentFilters object into HttpParams for json-server.
   * json-server supports exact-match filtering via query params:
   *   GET /payments?status=payé&studentId=abc
   */
  private buildParams(filters?: PaymentFilters): HttpParams {
    let params = new HttpParams();

    if (!filters) {
      return params;
    }

    const { fromDate, toDate, ...exactFilters } = filters;

    for (const [key, value] of Object.entries(exactFilters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }

    // json-server v1 supports _gte / _lte range operators
    if (fromDate) {
      params = params.set('dueDate_gte', fromDate);
    }
    if (toDate) {
      params = params.set('dueDate_lte', toDate);
    }

    return params;
  }

  private handleError(action: string, error: unknown): Observable<never> {
    console.error(`PaymentsService: failed to ${action}`, error);
    return throwError(() => new Error(`Failed to ${action}`));
  }
}
