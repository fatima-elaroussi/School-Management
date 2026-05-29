import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';

import { StudentsService } from '../../../students/services/students';
import { TeachersService } from '../../../teachers/services/teachers';
import { GroupsService } from '../../../groups/services/groups';
import { PaymentsService } from '../../../finance/services/payments';
import { Student } from '../../../students/models/student.model';
import { Teacher } from '../../../teachers/models/teacher.model';
import { Payment } from '../../../finance/models/payment.model';

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr',
  '05': 'Mai', '06': 'Juin', '07': 'Juil', '08': 'Août',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatTableModule,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent {
  private readonly studentsService = inject(StudentsService);
  private readonly teachersService = inject(TeachersService);
  private readonly groupsService   = inject(GroupsService);
  private readonly paymentsService = inject(PaymentsService);

  loading   = signal(true);
  loadError = signal(false);

  students = signal<Student[]>([]);
  teachers = signal<Teacher[]>([]);
  groups   = signal<{ id: string | number }[]>([]);
  payments = signal<Payment[]>([]);

  // ── Computed KPIs ────────────────────────────────────────────────────────────
  readonly totalStudents  = computed(() => this.students().length);
  readonly totalTeachers  = computed(() => this.teachers().length);
  readonly totalGroups    = computed(() => this.groups().length);

  readonly collectedRevenue = computed(() =>
    this.payments().filter(p => p.status === 'payé').reduce((s, p) => s + p.amount, 0),
  );

  readonly lateCount = computed(() =>
    this.payments().filter(p => p.status === 'en retard').length,
  );

  readonly pendingCount = computed(() =>
    this.payments().filter(p => p.status === 'en attente').length,
  );

  readonly collectionRate = computed(() => {
    const total = this.payments().length;
    return total ? Math.round((this.payments().filter(p => p.status === 'payé').length / total) * 100) : 0;
  });

  readonly stats = computed(() => [
    {
      title: 'Étudiants',
      value: this.totalStudents(),
      icon: 'groups',
      color: 'primary',
      route: '/students',
    },
    {
      title: 'Professeurs',
      value: this.totalTeachers(),
      icon: 'person',
      color: 'accent',
      route: '/teachers',
    },
    {
      title: 'Groupes',
      value: this.totalGroups(),
      icon: 'view_comfy',
      color: 'info',
      route: '/groups',
    },
    {
      title: 'Revenus encaissés',
      value: this.formatAmount(this.collectedRevenue()),
      icon: 'account_balance_wallet',
      color: 'success',
      route: '/finance/dashboard',
    },
    {
      title: 'Paiements en retard',
      value: this.lateCount(),
      icon: 'warning',
      color: 'danger',
      route: '/finance/payments',
    },
  ]);

  // ── Recent payments ──────────────────────────────────────────────────────────
  readonly studentMap = computed(() =>
    new Map(this.students().map(s => [String(s.id), s.fullName])),
  );

  readonly recentPayments = computed(() =>
    [...this.payments()]
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, 6)
      .map(p => ({
        ...p,
        studentName: this.studentMap().get(p.studentId) ?? p.studentId,
        monthLabel:  this.formatMonth(p.month),
      })),
  );

  readonly recentColumns = ['student', 'month', 'amount', 'status'];
  readonly skeletonItems = Array(5).fill(0);

  constructor() {
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.loadError.set(false);

    forkJoin({
      students: this.studentsService.getStudents(),
      teachers: this.teachersService.getTeachers(),
      groups:   this.groupsService.getGroups(),
      payments: this.paymentsService.getPayments(),
    }).subscribe({
      next: ({ students, teachers, groups, payments }) => {
        this.students.set(students ?? []);
        this.teachers.set(teachers ?? []);
        this.groups.set(groups ?? []);
        this.payments.set(payments ?? []);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  formatAmount(n: number): string {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return `${n}`;
  }

  formatAmountFull(n: number): string {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency', currency: 'MAD', maximumFractionDigits: 0,
    }).format(n);
  }

  formatMonth(m: string): string {
    if (!m) return '';
    const [, mm] = m.split('-');
    return MONTH_LABELS[mm] ?? m;
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      'payé': 'Payé', 'en attente': 'En attente',
      'en retard': 'En retard', 'annulé': 'Annulé',
    };
    return map[s] ?? s;
  }

  statusCss(s: string): string {
    const map: Record<string, string> = {
      'payé': 'badge-paid', 'en attente': 'badge-pending',
      'en retard': 'badge-late', 'annulé': 'badge-cancelled',
    };
    return map[s] ?? '';
  }
}
