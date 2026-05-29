import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  Expense,
  ExpenseCategory,
  ExpensePaymentMethod,
  RecurrenceFrequency,
} from '../../models/expense.model';
import { ExpensesService } from '../../services/expenses';

// ─── Dialog contract ──────────────────────────────────────────────────────────

export interface ExpenseDialogData {
  /** Pass an existing expense to open in edit mode; omit for create mode. */
  expense?: Expense;
}

export interface ExpenseDialogResult {
  saved: boolean;
}

// ─── Static option lists ──────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: 'salaires',    label: 'Salaires',          icon: 'people'             },
  { value: 'loyer',       label: 'Loyer',             icon: 'home_work'          },
  { value: 'fournitures', label: 'Fournitures',       icon: 'inventory_2'        },
  { value: 'équipement',  label: 'Équipement',        icon: 'computer'           },
  { value: 'maintenance', label: 'Maintenance',       icon: 'build'              },
  { value: 'services',    label: 'Services & Utili.', icon: 'wifi'               },
  { value: 'marketing',   label: 'Marketing',         icon: 'campaign'           },
  { value: 'formation',   label: 'Formation',         icon: 'school'             },
  { value: 'impôts',      label: 'Impôts & Taxes',    icon: 'account_balance'    },
  { value: 'autre',       label: 'Autre',             icon: 'more_horiz'         },
];

const METHOD_OPTIONS: { value: ExpensePaymentMethod; label: string }[] = [
  { value: 'espèces',      label: 'Espèces'      },
  { value: 'virement',     label: 'Virement'     },
  { value: 'chèque',       label: 'Chèque'       },
  { value: 'carte',        label: 'Carte bancaire' },
  { value: 'prélèvement',  label: 'Prélèvement'  },
];

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'unique',       label: 'Unique (ponctuelle)' },
  { value: 'mensuel',      label: 'Mensuelle'           },
  { value: 'trimestriel',  label: 'Trimestrielle'       },
  { value: 'annuel',       label: 'Annuelle'            },
];

// ─── Custom validators ────────────────────────────────────────────────────────

function positiveAmount(control: AbstractControl): ValidationErrors | null {
  const v = Number(control.value);
  return isNaN(v) || v <= 0 ? { positiveAmount: true } : null;
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-expense-form-dialog',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
  ],
  templateUrl: './expense-form-dialog.html',
  styleUrls: ['./expense-form-dialog.scss'],
})
export class ExpenseFormDialog {
  private readonly fb          = inject(FormBuilder);
  private readonly dialogRef   = inject(MatDialogRef<ExpenseFormDialog, ExpenseDialogResult>);
  private readonly service     = inject(ExpensesService);
  private readonly snackBar    = inject(MatSnackBar);
  readonly         data        = inject<ExpenseDialogData | null>(MAT_DIALOG_DATA);

  readonly isEditMode  = Boolean(this.data?.expense);
  readonly saveLoading = signal(false);

  // ─── Static lists exposed to template ──────────────────────────────────────
  readonly categoryOptions  = CATEGORY_OPTIONS;
  readonly methodOptions    = METHOD_OPTIONS;
  readonly recurrenceOptions = RECURRENCE_OPTIONS;

  // ─── Reactive form ──────────────────────────────────────────────────────────
  readonly form = this.fb.nonNullable.group({
    title: [
      this.data?.expense?.title ?? '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(120)],
    ],
    category: [
      this.data?.expense?.category ?? ('' as ExpenseCategory),
      [Validators.required],
    ],
    amount: [
      this.data?.expense?.amount ?? ('' as unknown as number),
      [Validators.required, positiveAmount],
    ],
    date: [
      this.data?.expense?.date
        ? new Date(this.data.expense.date)
        : (null as Date | null),
      [Validators.required],
    ],
    recurrence: [
      this.data?.expense?.recurrence ?? ('unique' as RecurrenceFrequency),
      [Validators.required],
    ],
    method: [
      this.data?.expense?.method ?? (null as ExpensePaymentMethod | null),
    ],
    vendor: [
      this.data?.expense?.vendor ?? '',
      [Validators.maxLength(100)],
    ],
    reference: [
      this.data?.expense?.reference ?? '',
      [Validators.maxLength(60)],
    ],
    notes: [
      this.data?.expense?.notes ?? '',
      [Validators.maxLength(500)],
    ],
  });

  // ─── Convenience field accessors (clean template error messages) ────────────
  get f() { return this.form.controls; }

  get dialogTitle(): string {
    return this.isEditMode ? 'Modifier la dépense' : 'Nouvelle dépense';
  }

  get notesLength(): number {
    return this.f.notes.value?.length ?? 0;
  }

  // ─── Save ───────────────────────────────────────────────────────────────────
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Veuillez remplir tous les champs obligatoires.', 'Fermer', {
        duration: 3500,
        panelClass: 'snack-warn',
      });
      return;
    }

    const raw  = this.form.getRawValue();
    const date = raw.date instanceof Date
      ? raw.date.toISOString().slice(0, 10)
      : String(raw.date);

    const payload = {
      title:      raw.title.trim(),
      category:   raw.category,
      amount:     Number(raw.amount),
      date,
      month:      date.slice(0, 7),                               // "YYYY-MM"
      paidDate:   this.data?.expense?.paidDate ?? null,
      status:     this.data?.expense?.status   ?? ('en attente' as const),
      recurrence: raw.recurrence,
      method:     raw.method ?? null,
      vendor:     raw.vendor?.trim()    || undefined,
      reference:  raw.reference?.trim() || undefined,
      notes:      raw.notes?.trim()     || undefined,
    };

    this.saveLoading.set(true);

    const action$ = this.isEditMode && this.data?.expense
      ? this.service.updateExpense(this.data.expense.id, payload)
      : this.service.createExpense(payload);

    action$.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEditMode ? 'Dépense modifiée.' : 'Dépense enregistrée.',
          'Fermer',
          { duration: 3000, panelClass: 'snack-success' },
        );
        this.dialogRef.close({ saved: true });
      },
      error: () => {
        this.snackBar.open('Erreur lors de l\'enregistrement.', 'Fermer', {
          duration: 4000,
          panelClass: 'snack-error',
        });
        this.saveLoading.set(false);
      },
      complete: () => this.saveLoading.set(false),
    });
  }

  cancel(): void {
    this.dialogRef.close({ saved: false });
  }
}
