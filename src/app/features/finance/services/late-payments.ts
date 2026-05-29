import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { Student } from '../../students/models/student.model';
import { StudentsService } from '../../students/services/students';
import { Payment } from '../models/payment.model';
import { PaymentsService } from './payments';

// ─── View-model ───────────────────────────────────────────────────────────────

/** Full picture of a student's financial situation. */
export interface LateStudentInfo {
  student:          Student;
  /** Amount still owed in the current accounting month. */
  remaining:        number;
  /** Total amount paid across ALL months. */
  totalPaid:        number;
  /** How many distinct months have at least one unpaid / overdue payment. */
  unpaidMonths:     number;
  /** ISO date of the most recent paid payment, or null. */
  lastPaymentDate:  string | null;
  /** True when paymentStatus === 'en retard' OR remaining > 0. */
  isLate:           boolean;
  /** Severity for UI colouring. */
  severity:         'critical' | 'warning' | 'ok';
}

export interface LatePaymentsSummary {
  lateStudents:       LateStudentInfo[];
  totalLate:          number;
  totalPendingAmount: number;
  criticalCount:      number;  // 2+ months overdue
  warningCount:       number;  // 1 month overdue
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class LatePaymentsService {
  private readonly studentsService = inject(StudentsService);
  private readonly paymentsService = inject(PaymentsService);

  /**
   * Emits a full LatePaymentsSummary by joining students and payment records.
   * Uses combineLatest so the result stays live if either stream refreshes.
   */
  getLatePaymentsSummary(): Observable<LatePaymentsSummary> {
    return combineLatest({
      students: this.studentsService.getStudents(),
      payments: this.paymentsService.getPayments(),
    }).pipe(
      map(({ students, payments }) =>
        this.computeSummary(students ?? [], payments ?? []),
      ),
    );
  }

  /**
   * Returns just the enriched student list — useful when you don't need the
   * aggregate totals.
   */
  getLateStudents(): Observable<LateStudentInfo[]> {
    return this.getLatePaymentsSummary().pipe(
      map((s) => s.lateStudents),
    );
  }

  // ─── Pure computation (no HTTP, easy to unit-test) ─────────────────────────

  computeSummary(
    students: Student[],
    payments: Payment[],
  ): LatePaymentsSummary {
    const infos = students.map((s) => this.buildInfo(s, payments));

    const lateStudents       = infos.filter((i) => i.isLate);
    const totalPendingAmount = lateStudents.reduce((sum, i) => sum + i.remaining, 0);
    const criticalCount      = lateStudents.filter((i) => i.severity === 'critical').length;
    const warningCount       = lateStudents.filter((i) => i.severity === 'warning').length;

    return {
      lateStudents,
      totalLate:    lateStudents.length,
      totalPendingAmount,
      criticalCount,
      warningCount,
    };
  }

  buildInfo(student: Student, payments: Payment[]): LateStudentInfo {
    const sid = String(student.id);

    // All payments belonging to this student
    const mine = payments.filter((p) => p.studentId === sid);

    // Paid payments this month
    const thisMonth    = currentMonth();
    const paidThisMonth = mine
      .filter((p) => p.month === thisMonth && p.status === 'payé')
      .reduce((s, p) => s + p.amount, 0);

    const totalPaid = mine
      .filter((p) => p.status === 'payé')
      .reduce((s, p) => s + p.amount, 0);

    // Remaining = monthly fee − what has been paid this month (floor 0)
    const monthly   = student.monthlyPayment ?? 0;
    const remaining = Math.max(0, monthly - paidThisMonth);

    // Count distinct months that have at least one non-paid payment
    const unpaidMonths = new Set(
      mine
        .filter((p) => p.status === 'en retard' || p.status === 'en attente')
        .map((p) => p.month),
    ).size;

    // Last paid date
    const paidDates = mine
      .filter((p) => p.paidDate)
      .map((p) => p.paidDate as string)
      .sort();
    const lastPaymentDate = paidDates.at(-1) ?? null;

    // A student is "late" if their status flag says so OR they owe money this month
    const isLate =
      student.paymentStatus === 'en retard' ||
      (remaining > 0 && paidThisMonth < monthly);

    const severity: LateStudentInfo['severity'] = !isLate
      ? 'ok'
      : unpaidMonths >= 2
        ? 'critical'
        : 'warning';

    return {
      student,
      remaining,
      totalPaid,
      unpaidMonths,
      lastPaymentDate,
      isLate,
      severity,
    };
  }
}
