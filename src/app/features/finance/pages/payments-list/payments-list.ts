import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { Student } from '../../../students/models/student.model';
import { StudentsService } from '../../../students/services/students';
import {
  PaymentDialogResult,
  PaymentFormDialog,
} from '../../components/payment-form-dialog/payment-form-dialog';
import { Payment, PaymentMethod, PaymentStatus, PaymentSummary } from '../../models/payment.model';
import { PaymentsService } from '../../services/payments';

type StatusFilter = 'all' | PaymentStatus;
type MethodFilter = 'all' | PaymentMethod;

@Component({
  selector: 'app-payments-list',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './payments-list.html',
  styleUrls: ['./payments-list.scss'],
})
export class PaymentsList {
  private readonly paymentsService = inject(PaymentsService);
  private readonly studentsService = inject(StudentsService);
  private readonly snackBar        = inject(MatSnackBar);
  private readonly dialog          = inject(MatDialog);

  // ─── State ──────────────────────────────────────────────────────────────────

  readonly loading    = signal(true);
  readonly loadError  = signal(false);
  readonly payments   = signal<Payment[]>([]);
  readonly students   = signal<Student[]>([]);

  readonly searchSignal       = signal('');
  readonly statusFilterSignal = signal<StatusFilter>('all');
  readonly methodFilterSignal = signal<MethodFilter>('all');
  readonly pageIndex          = signal(0);
  readonly pageSize           = signal(10);

  readonly dataSource   = new MatTableDataSource<Payment>([]);
  readonly pageSizeOptions = [5, 10, 25, 50];

  readonly displayedColumns = [
    'student', 'amount', 'month', 'status',
    'remaining', 'method', 'paidDate', 'actions',
  ];

  // ─── Lookup maps ────────────────────────────────────────────────────────────

  readonly studentById = computed(() =>
    new Map(this.students().map((s) => [String(s.id), s])),
  );

  // ─── Filter option lists ─────────────────────────────────────────────────────

  readonly statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all',        label: 'Tous les statuts' },
    { value: 'payé',       label: 'Payé' },
    { value: 'en attente', label: 'En attente' },
    { value: 'en retard',  label: 'En retard' },
    { value: 'annulé',     label: 'Annulé' },
  ];

  readonly methodOptions: { value: MethodFilter; label: string }[] = [
    { value: 'all',      label: 'Tous les moyens' },
    { value: 'espèces',  label: 'Espèces' },
    { value: 'virement', label: 'Virement' },
    { value: 'chèque',   label: 'Chèque' },
    { value: 'carte',    label: 'Carte' },
  ];

  // ─── Two-way bound filter getters / setters ──────────────────────────────────

  get search(): string { return this.searchSignal(); }
  set search(v: string) {
    this.searchSignal.set(v);
    this.pageIndex.set(0);
    this.updateTable();
  }

  get statusFilter(): StatusFilter { return this.statusFilterSignal(); }
  set statusFilter(v: StatusFilter) {
    this.statusFilterSignal.set(v);
    this.pageIndex.set(0);
    this.updateTable();
  }

  get methodFilter(): MethodFilter { return this.methodFilterSignal(); }
  set methodFilter(v: MethodFilter) {
    this.methodFilterSignal.set(v);
    this.pageIndex.set(0);
    this.updateTable();
  }

  // ─── Derived data ────────────────────────────────────────────────────────────

  readonly filteredPayments = computed(() => {
    const query  = this.searchSignal().trim().toLowerCase();
    const status = this.statusFilterSignal();
    const method = this.methodFilterSignal();
    const map    = this.studentById();

    return this.payments().filter((p) => {
      if (status !== 'all' && p.status !== status) return false;
      if (method !== 'all' && p.method  !== method) return false;
      if (query) {
        const student = map.get(p.studentId);
        const name    = student?.fullName?.toLowerCase() ?? '';
        if (!name.includes(query)) return false;
      }
      return true;
    });
  });

  readonly pagedPayments = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredPayments().slice(start, start + this.pageSize());
  });

  readonly totalCount    = computed(() => this.payments().length);
  readonly filteredCount = computed(() => this.filteredPayments().length);
  readonly pageCount     = computed(() =>
    Math.max(1, Math.ceil(this.filteredCount() / this.pageSize())),
  );

  readonly summary = computed<PaymentSummary>(() =>
    this.paymentsService.getSummary(this.payments()),
  );

  readonly hasActiveFilter = computed(() =>
    this.statusFilter !== 'all' ||
    this.methodFilter !== 'all' ||
    this.search !== '',
  );

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  constructor() {
    this.loadAll();
  }

  // ─── Dialog ──────────────────────────────────────────────────────────────────

  openPaymentDialog(payment?: Payment): void {
    const ref = this.dialog.open<PaymentFormDialog, { payment?: Payment }, PaymentDialogResult>(
      PaymentFormDialog,
      {
        width:     '660px',
        maxWidth:  '95vw',
        maxHeight: '90vh',
        autoFocus: 'first-tabbable',
        data:      { payment },
      },
    );

    ref.afterClosed().subscribe((result) => {
      if (result?.saved) {
        this.loadAll();
      }
    });
  }

  // ─── Mark as paid ────────────────────────────────────────────────────────────

  markAsPaid(payment: Payment): void {
    const ref = this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        title:       'Confirmer le paiement',
        message:     `Marquer le paiement de ${this.getStudentName(payment.studentId)} (${payment.month}) comme payé ?`,
        confirmText: 'Marquer payé',
        cancelText:  'Annuler',
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      const today = new Date().toISOString().slice(0, 10);
      this.paymentsService.markAsPaid(payment.id, null, today).subscribe({
        next: () => {
          this.snackBar.open('Paiement confirmé avec succès.', 'Fermer', { duration: 3000 });
          this.loadAll();
        },
        error: () =>
          this.snackBar.open('Erreur lors de la confirmation.', 'Fermer', { duration: 3000 }),
      });
    });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────────

  deletePayment(payment: Payment): void {
    const ref = this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        title:       'Supprimer le paiement',
        message:     `Supprimer définitivement le paiement de ${this.getStudentName(payment.studentId)} (${payment.month}) ? Cette action est irréversible.`,
        confirmText: 'Supprimer',
        cancelText:  'Annuler',
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.paymentsService.deletePayment(payment.id).subscribe({
        next: () => {
          this.snackBar.open('Paiement supprimé.', 'Fermer', { duration: 3000 });
          this.loadAll();
        },
        error: () =>
          this.snackBar.open('Erreur lors de la suppression.', 'Fermer', { duration: 3000 }),
      });
    });
  }

  // ─── Data loading ────────────────────────────────────────────────────────────

  loadAll(): void {
    this.loading.set(true);
    this.loadError.set(false);

    forkJoin({
      payments: this.paymentsService.getPayments(),
      students: this.studentsService.getStudents(),
    }).subscribe({
      next: ({ payments, students }) => {
        this.students.set(students ?? []);
        this.payments.set(payments ?? []);
        this.pageIndex.set(0);
        this.updateTable();
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
        this.snackBar.open('Impossible de charger les paiements.', 'Fermer', { duration: 4000 });
      },
      complete: () => this.loading.set(false),
    });
  }

  // ─── Table helpers ───────────────────────────────────────────────────────────

  private updateTable(): void {
    const total   = this.filteredPayments().length;
    const maxPage = Math.max(0, Math.ceil(total / this.pageSize()) - 1);
    if (this.pageIndex() > maxPage) this.pageIndex.set(maxPage);
    this.dataSource.data = this.pagedPayments();
  }

  onPage(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.updateTable();
  }

  clearFilters(): void {
    this.searchSignal.set('');
    this.statusFilterSignal.set('all');
    this.methodFilterSignal.set('all');
    this.pageIndex.set(0);
    this.updateTable();
  }

  // ─── Domain helpers ──────────────────────────────────────────────────────────

  getStudentName(studentId: string): string {
    return this.studentById().get(studentId)?.fullName ?? `Étudiant ${studentId}`;
  }

  /** Amount still owed: 0 if paid, full amount otherwise. */
  getRemaining(payment: Payment): number {
    return payment.status === 'payé' ? 0 : payment.amount;
  }

  statusLabel(status: PaymentStatus): string {
    const labels: Record<PaymentStatus, string> = {
      'payé':       'Payé',
      'en attente': 'En attente',
      'en retard':  'En retard',
      'annulé':     'Annulé',
    };
    return labels[status] ?? status;
  }

  statusColor(status: PaymentStatus): string {
    const colors: Record<PaymentStatus, string> = {
      'payé':       'chip-paid',
      'en attente': 'chip-pending',
      'en retard':  'chip-overdue',
      'annulé':     'chip-cancelled',
    };
    return colors[status] ?? '';
  }

  methodLabel(method: PaymentMethod | null): string {
    if (!method) return '—';
    const labels: Record<PaymentMethod, string> = {
      'espèces':  'Espèces',
      'virement': 'Virement',
      'chèque':   'Chèque',
      'carte':    'Carte',
    };
    return labels[method] ?? method;
  }

  methodIcon(method: PaymentMethod | null): string {
    const icons: Record<string, string> = {
      'espèces':  'payments',
      'virement': 'account_balance',
      'chèque':   'receipt_long',
      'carte':    'credit_card',
    };
    return method ? (icons[method] ?? 'help_outline') : 'remove';
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-MA', {
      style:    'currency',
      currency: 'MAD',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  formatDate(date: string | null): string {
    if (!date) return '—';
    return new Intl.DateTimeFormat('fr-MA', {
      day: '2-digit', month: 'short', year: 'numeric',
    }).format(new Date(date));
  }

  trackById(_i: number, p: Payment): string { return p.id; }
}
