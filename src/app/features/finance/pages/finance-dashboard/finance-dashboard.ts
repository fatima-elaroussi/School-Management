import { Component, computed, effect, inject, signal, viewChildren } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ChartData, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { Student } from '../../../students/models/student.model';
import { StudentsService } from '../../../students/services/students';
import { Expense } from '../../models/expense.model';
import { Payment, PaymentStatus } from '../../models/payment.model';
import { ExpensesService } from '../../services/expenses';
import { PaymentsService } from '../../services/payments';

// ─── Domain constants ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  salaires:    '#7c3aed',
  loyer:       '#2563eb',
  fournitures: '#059669',
  équipement:  '#0891b2',
  maintenance: '#d97706',
  services:    '#0284c7',
  marketing:   '#db2777',
  formation:   '#16a34a',
  impôts:      '#475569',
  autre:       '#6b7280',
};

const CATEGORY_LABELS: Record<string, string> = {
  salaires: 'Salaires', loyer: 'Loyer', fournitures: 'Fournitures',
  équipement: 'Équipement', maintenance: 'Maintenance', services: 'Services',
  marketing: 'Marketing', formation: 'Formation', impôts: 'Impôts', autre: 'Autre',
};

const MONTH_SHORT: Record<string, string> = {
  '01': 'Janv.', '02': 'Févr.', '03': 'Mars', '04': 'Avr.',
  '05': 'Mai',   '06': 'Juin',  '07': 'Juil.','08': 'Août',
  '09': 'Sept.', '10': 'Oct.',  '11': 'Nov.', '12': 'Déc.',
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getLast6Months(): string[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shortLabel(m: string): string {
  return MONTH_SHORT[m.split('-')[1]] ?? m;
}

// ─── View-model ───────────────────────────────────────────────────────────────

export interface RecentPayment {
  id: string;
  studentName: string;
  month: string;
  amount: number;
  status: PaymentStatus;
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [
    RouterModule,
    BaseChartDirective,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './finance-dashboard.html',
  styleUrls: ['./finance-dashboard.scss'],
})
export class FinanceDashboard {
  private readonly paymentsService = inject(PaymentsService);
  private readonly expensesService = inject(ExpensesService);
  private readonly studentsService = inject(StudentsService);

  // ─── Chart directive references (for programmatic update) ─────────────────
  private readonly charts = viewChildren(BaseChartDirective);

  // ─── Raw state ────────────────────────────────────────────────────────────

  readonly loading   = signal(true);
  readonly loadError = signal(false);
  readonly payments  = signal<Payment[]>([]);
  readonly expenses  = signal<Expense[]>([]);
  readonly students  = signal<Student[]>([]);

  // ─── KPI computed signals ─────────────────────────────────────────────────

  readonly totalRevenue = computed(() =>
    this.payments().filter(p => p.status === 'payé').reduce((s, p) => s + p.amount, 0),
  );

  readonly totalExpenses = computed(() =>
    this.expenses().filter(e => e.status === 'payé').reduce((s, e) => s + e.amount, 0),
  );

  readonly monthlyRevenue = computed(() => {
    const m = currentMonth();
    return this.payments().filter(p => p.status === 'payé' && p.month === m)
      .reduce((s, p) => s + p.amount, 0);
  });

  readonly monthlyExpenses = computed(() => {
    const m = currentMonth();
    return this.expenses().filter(e => e.status === 'payé' && e.month === m)
      .reduce((s, e) => s + e.amount, 0);
  });

  readonly monthlyProfit = computed(() => this.monthlyRevenue() - this.monthlyExpenses());

  readonly latePaymentsCount  = computed(() => this.payments().filter(p => p.status === 'en retard').length);
  readonly latePaymentsAmount = computed(() =>
    this.payments().filter(p => p.status === 'en retard').reduce((s, p) => s + p.amount, 0),
  );

  readonly pendingPaymentsCount = computed(() =>
    this.payments().filter(p => p.status === 'en attente').length,
  );

  readonly collectionRate = computed(() => {
    const total = this.payments().length;
    return total ? Math.round((this.payments().filter(p => p.status === 'payé').length / total) * 100) : 0;
  });

  // ─── Bar chart — monthly revenues vs expenses (last 6 months) ─────────────

  readonly barChartData = computed<ChartData<'bar'>>(() => {
    const months = getLast6Months();
    return {
      labels: months.map(shortLabel),
      datasets: [
        {
          label: 'Revenus',
          data: months.map(m =>
            this.payments().filter(p => p.status === 'payé' && p.month === m)
              .reduce((s, p) => s + p.amount, 0),
          ),
          backgroundColor: 'rgba(37,99,235,0.82)',
          hoverBackgroundColor: 'rgba(37,99,235,1)',
          borderRadius: 7,
          borderSkipped: false,
        },
        {
          label: 'Dépenses',
          data: months.map(m =>
            this.expenses().filter(e => e.status === 'payé' && e.month === m)
              .reduce((s, e) => s + e.amount, 0),
          ),
          backgroundColor: 'rgba(220,38,38,0.78)',
          hoverBackgroundColor: 'rgba(220,38,38,1)',
          borderRadius: 7,
          borderSkipped: false,
        },
      ],
    };
  });

  readonly barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 18,
          font: { size: 12, family: 'inherit' },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(13,31,53,0.92)',
        titleFont: { size: 13, weight: 'bold', family: 'inherit' },
        bodyFont:  { size: 12, family: 'inherit' },
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: ctx =>
            ` ${ctx.dataset.label} : ${Number(ctx.parsed.y).toLocaleString('fr-MA')} MAD`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { font: { size: 11, family: 'inherit' }, color: '#7a8fa3' },
      },
      y: {
        grid: { color: 'rgba(30,60,100,0.07)', lineWidth: 1 },
        border: { display: false, dash: [4, 4] },
        ticks: {
          font: { size: 11, family: 'inherit' },
          color: '#7a8fa3',
          callback: v => `${(Number(v) / 1000).toFixed(0)}K`,
        },
      },
    },
  };

  // ─── Doughnut chart — expenses by category ────────────────────────────────

  readonly doughnutData = computed<ChartData<'doughnut'>>(() => {
    const breakdown = this.expensesService.getBreakdownByCategory(
      this.expenses().filter(e => e.status === 'payé'),
    );

    return {
      labels:   breakdown.map(b => CATEGORY_LABELS[b.category] ?? b.category),
      datasets: [{
        data:            breakdown.map(b => b.totalAmount),
        backgroundColor: breakdown.map(b => CATEGORY_COLORS[b.category] ?? '#6b7280'),
        hoverBackgroundColor: breakdown.map(b => (CATEGORY_COLORS[b.category] ?? '#6b7280') + 'dd'),
        borderWidth:  3,
        borderColor:  '#ffffff',
        hoverOffset:  10,
      }],
    };
  });

  readonly doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 14,
          font: { size: 12, family: 'inherit' },
          generateLabels: chart => {
            const data = chart.data;
            return (data.labels as string[]).map((label, i) => ({
              text:        label,
              fillStyle:   (data.datasets[0].backgroundColor as string[])[i],
              hidden:      false,
              index:       i,
              strokeStyle: '#fff',
              fontColor:   '#3d5470',
            }));
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(13,31,53,0.92)',
        titleFont: { size: 13, weight: 'bold', family: 'inherit' },
        bodyFont:  { size: 12, family: 'inherit' },
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: ctx => {
            const val = ctx.parsed;
            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const pct = total ? ((val / total) * 100).toFixed(1) : '0';
            return ` ${val.toLocaleString('fr-MA')} MAD (${pct}%)`;
          },
        },
      },
    },
  };

  // ─── Recent payments table ────────────────────────────────────────────────

  readonly studentById = computed(() =>
    new Map(this.students().map(s => [String(s.id), s.fullName])),
  );

  readonly recentPayments = computed<RecentPayment[]>(() =>
    [...this.payments()]
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, 8)
      .map(p => ({
        id:          p.id,
        studentName: this.studentById().get(p.studentId) ?? p.studentId,
        month:       p.month,
        amount:      p.amount,
        status:      p.status,
      })),
  );

  readonly recentColumns = ['student', 'month', 'amount', 'status'];

  // ─── Skeleton helpers ─────────────────────────────────────────────────────

  readonly skeletonRows = Array(5).fill(0);

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  constructor() {
    this.loadAll();

    // When payments/expenses signals change after initial load, refresh all
    // Chart.js instances so they animate to the new data.
    effect(() => {
      // Register signal dependencies
      this.barChartData();
      this.doughnutData();
      // Notify every chart instance
      this.charts().forEach(c => c.chart?.update());
    });
  }

  loadAll(): void {
    this.loading.set(true);
    this.loadError.set(false);

    forkJoin({
      payments: this.paymentsService.getPayments(),
      expenses: this.expensesService.getExpenses(),
      students: this.studentsService.getStudents(),
    }).subscribe({
      next: ({ payments, expenses, students }) => {
        this.payments.set(payments ?? []);
        this.expenses.set(expenses ?? []);
        this.students.set(students ?? []);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  // ─── Display helpers ──────────────────────────────────────────────────────

  formatAmount(n: number): string {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency', currency: 'MAD', maximumFractionDigits: 0,
    }).format(n);
  }

  formatAmountCompact(n: number): string {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M MAD`;
    if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(1)}K MAD`;
    return `${n} MAD`;
  }

  statusLabel(s: PaymentStatus): string {
    const m: Record<PaymentStatus, string> = {
      'payé': 'Payé', 'en attente': 'En attente',
      'en retard': 'En retard', 'annulé': 'Annulé',
    };
    return m[s] ?? s;
  }

  statusCss(s: PaymentStatus): string {
    const m: Record<PaymentStatus, string> = {
      'payé': 'badge-paid', 'en attente': 'badge-pending',
      'en retard': 'badge-late', 'annulé': 'badge-cancelled',
    };
    return m[s] ?? '';
  }

  currentMonthLabel(): string {
    return new Intl.DateTimeFormat('fr-MA', { month: 'long', year: 'numeric' }).format(new Date());
  }

  profitSign(): string { return this.monthlyProfit() >= 0 ? '+' : ''; }
}
