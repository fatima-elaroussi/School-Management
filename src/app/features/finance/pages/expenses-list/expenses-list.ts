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
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import {
  ExpenseDialogResult,
  ExpenseFormDialog,
} from '../../components/expense-form-dialog/expense-form-dialog';
import {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  ExpenseSummary,
} from '../../models/expense.model';
import { ExpensesService } from '../../services/expenses';

type CategoryFilter = 'all' | ExpenseCategory;
type StatusFilter   = 'all' | ExpenseStatus;

@Component({
  selector: 'app-expenses-list',
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
  templateUrl: './expenses-list.html',
  styleUrls: ['./expenses-list.scss'],
})
export class ExpensesList {
  private readonly expensesService = inject(ExpensesService);
  private readonly dialog          = inject(MatDialog);
  private readonly snackBar        = inject(MatSnackBar);

  // ─── State ──────────────────────────────────────────────────────────────────

  readonly loading   = signal(true);
  readonly loadError = signal(false);
  readonly expenses  = signal<Expense[]>([]);

  readonly searchSignal         = signal('');
  readonly categoryFilterSignal = signal<CategoryFilter>('all');
  readonly statusFilterSignal   = signal<StatusFilter>('all');
  readonly pageIndex            = signal(0);
  readonly pageSize             = signal(10);

  readonly dataSource      = new MatTableDataSource<Expense>([]);
  readonly pageSizeOptions = [5, 10, 25, 50];

  readonly displayedColumns = [
    'title', 'category', 'amount', 'date', 'status', 'recurrence', 'actions',
  ];

  // ─── Filter option lists ──────────────────────────────────────────────────

  readonly categoryOptions: { value: CategoryFilter; label: string; icon: string }[] = [
    { value: 'all',          label: 'Toutes catégories', icon: 'apps'             },
    { value: 'salaires',     label: 'Salaires',          icon: 'people'           },
    { value: 'loyer',        label: 'Loyer',             icon: 'home_work'        },
    { value: 'fournitures',  label: 'Fournitures',       icon: 'inventory_2'      },
    { value: 'équipement',   label: 'Équipement',        icon: 'computer'         },
    { value: 'maintenance',  label: 'Maintenance',       icon: 'build'            },
    { value: 'services',     label: 'Services',          icon: 'wifi'             },
    { value: 'marketing',    label: 'Marketing',         icon: 'campaign'         },
    { value: 'formation',    label: 'Formation',         icon: 'school'           },
    { value: 'impôts',       label: 'Impôts',            icon: 'account_balance'  },
    { value: 'autre',        label: 'Autre',             icon: 'more_horiz'       },
  ];

  readonly statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all',        label: 'Tous les statuts' },
    { value: 'payé',       label: 'Payé'             },
    { value: 'en attente', label: 'En attente'       },
    { value: 'rejeté',     label: 'Rejeté'           },
  ];

  // ─── Two-way filter getters / setters ─────────────────────────────────────

  get search(): string { return this.searchSignal(); }
  set search(v: string) {
    this.searchSignal.set(v);
    this.pageIndex.set(0);
    this.updateTable();
  }

  get categoryFilter(): CategoryFilter { return this.categoryFilterSignal(); }
  set categoryFilter(v: CategoryFilter) {
    this.categoryFilterSignal.set(v);
    this.pageIndex.set(0);
    this.updateTable();
  }

  get statusFilter(): StatusFilter { return this.statusFilterSignal(); }
  set statusFilter(v: StatusFilter) {
    this.statusFilterSignal.set(v);
    this.pageIndex.set(0);
    this.updateTable();
  }

  // ─── Derived / computed ───────────────────────────────────────────────────

  readonly filteredExpenses = computed(() => {
    const query    = this.searchSignal().trim().toLowerCase();
    const category = this.categoryFilterSignal();
    const status   = this.statusFilterSignal();

    return this.expenses().filter((e) => {
      if (category !== 'all' && e.category !== category) return false;
      if (status   !== 'all' && e.status   !== status)   return false;
      if (query) {
        const haystack = [e.title, e.category, e.vendor ?? '', e.reference ?? '']
          .join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  });

  readonly pagedExpenses = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredExpenses().slice(start, start + this.pageSize());
  });

  readonly totalCount    = computed(() => this.expenses().length);
  readonly filteredCount = computed(() => this.filteredExpenses().length);
  readonly pageCount     = computed(() =>
    Math.max(1, Math.ceil(this.filteredCount() / this.pageSize())),
  );

  readonly summary = computed<ExpenseSummary>(() =>
    this.expensesService.getSummary(this.expenses()),
  );

  readonly hasActiveFilter = computed(() =>
    this.categoryFilter !== 'all' ||
    this.statusFilter   !== 'all' ||
    this.search !== '',
  );

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  constructor() { this.loadExpenses(); }

  // ─── Data loading ─────────────────────────────────────────────────────────

  loadExpenses(): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.expensesService.getExpenses().subscribe({
      next: (expenses) => {
        this.expenses.set(expenses ?? []);
        this.pageIndex.set(0);
        this.updateTable();
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
        this.snackBar.open('Impossible de charger les dépenses.', 'Fermer', { duration: 4000 });
      },
      complete: () => this.loading.set(false),
    });
  }

  // ─── Table helpers ────────────────────────────────────────────────────────

  private updateTable(): void {
    const total   = this.filteredExpenses().length;
    const maxPage = Math.max(0, Math.ceil(total / this.pageSize()) - 1);
    if (this.pageIndex() > maxPage) this.pageIndex.set(maxPage);
    this.dataSource.data = this.pagedExpenses();
  }

  onPage(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.updateTable();
  }

  clearFilters(): void {
    this.searchSignal.set('');
    this.categoryFilterSignal.set('all');
    this.statusFilterSignal.set('all');
    this.pageIndex.set(0);
    this.updateTable();
  }

  // ─── Dialog actions ───────────────────────────────────────────────────────

  openExpenseDialog(expense?: Expense): void {
    const ref = this.dialog.open<ExpenseFormDialog, { expense?: Expense }, ExpenseDialogResult>(
      ExpenseFormDialog,
      {
        width:     '660px',
        maxWidth:  '95vw',
        maxHeight: '90vh',
        autoFocus: 'first-tabbable',
        data:      { expense },
      },
    );

    ref.afterClosed().subscribe((result) => {
      if (result?.saved) this.loadExpenses();
    });
  }

  deleteExpense(expense: Expense): void {
    const ref = this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        title:       'Supprimer la dépense',
        message:     `Supprimer définitivement "${expense.title}" ? Cette action est irréversible.`,
        confirmText: 'Supprimer',
        cancelText:  'Annuler',
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.expensesService.deleteExpense(expense.id).subscribe({
        next: () => {
          this.snackBar.open('Dépense supprimée.', 'Fermer', { duration: 3000 });
          this.loadExpenses();
        },
        error: () =>
          this.snackBar.open('Erreur lors de la suppression.', 'Fermer', { duration: 3000 }),
      });
    });
  }

  markExpenseAsPaid(expense: Expense): void {
    const ref = this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        title:       'Confirmer le paiement',
        message:     `Marquer "${expense.title}" comme payé ?`,
        confirmText: 'Confirmer',
        cancelText:  'Annuler',
      },
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.expensesService.markAsPaid(expense.id, null).subscribe({
        next: () => {
          this.snackBar.open('Dépense marquée comme payée.', 'Fermer', { duration: 3000 });
          this.loadExpenses();
        },
        error: () =>
          this.snackBar.open('Erreur lors de la confirmation.', 'Fermer', { duration: 3000 }),
      });
    });
  }

  // ─── Display helpers ──────────────────────────────────────────────────────

  categoryLabel(cat: ExpenseCategory): string {
    return this.categoryOptions.find((o) => o.value === cat)?.label ?? cat;
  }

  categoryIcon(cat: ExpenseCategory): string {
    return this.categoryOptions.find((o) => o.value === cat)?.icon ?? 'label';
  }

  categoryColor(cat: ExpenseCategory): string {
    const map: Record<ExpenseCategory, string> = {
      salaires:    'cat-salaires',
      loyer:       'cat-loyer',
      fournitures: 'cat-fournitures',
      équipement:  'cat-equipement',
      maintenance: 'cat-maintenance',
      services:    'cat-services',
      marketing:   'cat-marketing',
      formation:   'cat-formation',
      impôts:      'cat-impots',
      autre:       'cat-autre',
    };
    return map[cat] ?? 'cat-autre';
  }

  statusLabel(status: ExpenseStatus): string {
    const map: Record<ExpenseStatus, string> = {
      'payé':       'Payé',
      'en attente': 'En attente',
      'rejeté':     'Rejeté',
    };
    return map[status] ?? status;
  }

  statusCss(status: ExpenseStatus): string {
    const map: Record<ExpenseStatus, string> = {
      'payé':       'chip-paid',
      'en attente': 'chip-pending',
      'rejeté':     'chip-rejected',
    };
    return map[status] ?? '';
  }

  recurrenceLabel(r: string): string {
    const map: Record<string, string> = {
      unique:      'Unique',
      mensuel:     'Mensuel',
      trimestriel: 'Trimestriel',
      annuel:      'Annuel',
    };
    return map[r] ?? r;
  }

  formatAmount(n: number): string {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency', currency: 'MAD', maximumFractionDigits: 0,
    }).format(n);
  }

  formatDate(date: string | null): string {
    if (!date) return '—';
    return new Intl.DateTimeFormat('fr-MA', {
      day: '2-digit', month: 'short', year: 'numeric',
    }).format(new Date(date));
  }

  trackById(_i: number, e: Expense): string { return e.id; }
}
