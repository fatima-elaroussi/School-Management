import { toSignal } from '@angular/core/rxjs-interop';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription, startWith } from 'rxjs';
import { Student } from '../../../students/models/student.model';
import { StudentsService } from '../../../students/services/students';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
} from '../../models/payment.model';
import { PaymentsService } from '../../services/payments';

// ─── Dialog contract ──────────────────────────────────────────────────────────

export interface PaymentDialogData {
  payment?: Payment;
  preselectedStudentId?: string;
}

export interface PaymentDialogResult {
  saved: boolean;
  payment?: Payment;
}

// ─── Static option lists ──────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: PaymentStatus; label: string; icon: string; css: string }[] = [
  { value: 'payé',       label: 'Payé',       icon: 'check_circle',  css: 'status-paid'      },
  { value: 'en attente', label: 'En attente', icon: 'schedule',      css: 'status-pending'   },
  { value: 'en retard',  label: 'En retard',  icon: 'warning_amber', css: 'status-overdue'   },
  { value: 'annulé',     label: 'Annulé',     icon: 'cancel',        css: 'status-cancelled' },
];

const METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'espèces',  label: 'Espèces',        icon: 'payments'        },
  { value: 'virement', label: 'Virement',       icon: 'account_balance' },
  { value: 'chèque',   label: 'Chèque',         icon: 'receipt_long'    },
  { value: 'carte',    label: 'Carte bancaire', icon: 'credit_card'     },
];

const TYPE_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: 'mensualité',  label: 'Mensualité'  },
  { value: 'inscription', label: 'Inscription' },
  { value: 'matériel',    label: 'Matériel'    },
  { value: 'autre',       label: 'Autre'       },
];

// ─── Custom validator ─────────────────────────────────────────────────────────

function positiveAmount(ctrl: AbstractControl): ValidationErrors | null {
  const v = Number(ctrl.value);
  return isNaN(v) || v <= 0 ? { positiveAmount: true } : null;
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-payment-form-dialog',
  standalone: true,
  // provideNativeDateAdapter supplies DateAdapter + MAT_DATE_FORMATS for the
  // MatDatepicker in this component's subtree.
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
    MatTooltipModule,
  ],
  templateUrl: './payment-form-dialog.html',
  styleUrls: ['./payment-form-dialog.scss'],
})
export class PaymentFormDialog implements OnDestroy {
  private readonly fb              = inject(FormBuilder);
  private readonly dialogRef       = inject(MatDialogRef<PaymentFormDialog, PaymentDialogResult>);
  private readonly paymentsService = inject(PaymentsService);
  private readonly studentsService = inject(StudentsService);
  private readonly snackBar        = inject(MatSnackBar);
  readonly data = inject<PaymentDialogData | null>(MAT_DIALOG_DATA);

  readonly isEditMode  = Boolean(this.data?.payment);
  readonly saveLoading = signal(false);
  readonly students    = signal<Student[]>([]);

  readonly statusOptions = STATUS_OPTIONS;
  readonly methodOptions = METHOD_OPTIONS;
  readonly typeOptions   = TYPE_OPTIONS;
  readonly String        = String; // expose for template

  private readonly existing = this.data?.payment;

  // ─── Form ─────────────────────────────────────────────────────────────────

  readonly form = this.fb.nonNullable.group({
    studentId: [
      this.data?.preselectedStudentId ?? this.existing?.studentId ?? '',
      Validators.required,
    ],
    type: [
      (this.existing?.type ?? 'mensualité') as PaymentType,
      Validators.required,
    ],
    amount: [
      this.existing?.amount ?? ('' as unknown as number),
      [Validators.required, positiveAmount],
    ],
    // Stored as "YYYY-MM" string — native <input type="month"> keeps it simple.
    month: [
      this.existing?.month ?? '',
      [Validators.required, Validators.pattern(/^\d{4}-(0[1-9]|1[0-2])$/)],
    ],
    status: [
      (this.existing?.status ?? 'en attente') as PaymentStatus,
      Validators.required,
    ],
    // Required conditionally when status = 'payé' (see watchStatus).
    method: [this.existing?.method ?? (null as PaymentMethod | null)],
    // Required conditionally when status = 'payé'.
    paidDate: [
      this.existing?.paidDate ? new Date(this.existing.paidDate) : (null as Date | null),
    ],
    notes: [this.existing?.notes ?? '', Validators.maxLength(500)],
  });

  // ─── Reactive signals ──────────────────────────────────────────────────────

  readonly amountSignal = toSignal(
    this.form.controls.amount.valueChanges.pipe(startWith(this.existing?.amount ?? 0)),
    { initialValue: (this.existing?.amount ?? 0) as number },
  );

  readonly statusSignal = toSignal(
    this.form.controls.status.valueChanges.pipe(
      startWith(this.existing?.status ?? 'en attente'),
    ),
    { initialValue: (this.existing?.status ?? 'en attente') as PaymentStatus },
  );

  readonly remainingAmount = computed(() =>
    this.statusSignal() === 'payé' ? 0 : Math.max(0, Number(this.amountSignal()) || 0),
  );

  readonly showPaymentDetails = computed(() => this.statusSignal() === 'payé');

  readonly remainingLabel = computed(() =>
    this.showPaymentDetails()
      ? '0,00 MAD — Soldé'
      : this.formatAmount(this.remainingAmount()),
  );

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  private readonly subs = new Subscription();

  constructor() {
    this.loadStudents();
    this.watchStatus();
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  // ─── Accessors ─────────────────────────────────────────────────────────────

  get f() { return this.form.controls; }

  get dialogTitle() {
    return this.isEditMode ? 'Modifier le paiement' : 'Nouveau paiement';
  }

  get notesLength() { return this.f.notes.value?.length ?? 0; }

  // ─── Save ──────────────────────────────────────────────────────────────────

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open(
        'Veuillez compléter tous les champs obligatoires.',
        'Fermer',
        { duration: 4000 },
      );
      return;
    }

    const raw        = this.form.getRawValue();
    const monthStr   = raw.month;
    const dueDateStr = `${monthStr}-01`;

    const paidDate = raw.status === 'payé' && raw.paidDate instanceof Date
      ? raw.paidDate.toISOString().slice(0, 10)
      : (this.existing?.paidDate ?? null);

    const payload = {
      studentId: raw.studentId,
      groupId:   this.existing?.groupId,
      type:      raw.type,
      amount:    Number(raw.amount),
      month:     monthStr,
      dueDate:   this.existing?.dueDate ?? dueDateStr,
      status:    raw.status,
      method:    raw.status === 'payé' ? (raw.method ?? null) : null,
      paidDate,
      notes:     raw.notes?.trim() || undefined,
    };

    this.saveLoading.set(true);

    const action$ = this.isEditMode && this.existing
      ? this.paymentsService.updatePayment(this.existing.id, payload)
      : this.paymentsService.createPayment(payload);

    action$.subscribe({
      next: (payment) => {
        this.snackBar.open(
          this.isEditMode ? 'Paiement modifié.' : 'Paiement enregistré.',
          'Fermer',
          { duration: 3000 },
        );
        this.dialogRef.close({ saved: true, payment });
      },
      error: () => {
        this.snackBar.open("Erreur lors de l'enregistrement.", 'Fermer', { duration: 4000 });
        this.saveLoading.set(false);
      },
      complete: () => this.saveLoading.set(false),
    });
  }

  cancel(): void { this.dialogRef.close({ saved: false }); }

  formatAmount(n: number): string {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency', currency: 'MAD', maximumFractionDigits: 2,
    }).format(n);
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private loadStudents(): void {
    this.studentsService.getStudents().subscribe({
      next:  (s) => this.students.set(s ?? []),
      error: ()  => this.students.set([]),
    });
  }

  private watchStatus(): void {
    const sub = this.form.controls.status.valueChanges
      .pipe(startWith(this.form.controls.status.value))
      .subscribe((status) => {
        const methodCtrl   = this.form.controls.method;
        const paidDateCtrl = this.form.controls.paidDate;

        if (status === 'payé') {
          methodCtrl.addValidators(Validators.required);
          paidDateCtrl.addValidators(Validators.required);
        } else {
          methodCtrl.removeValidators(Validators.required);
          paidDateCtrl.removeValidators(Validators.required);
          paidDateCtrl.setValue(null, { emitEvent: false });
        }

        methodCtrl.updateValueAndValidity({ emitEvent: false });
        paidDateCtrl.updateValueAndValidity({ emitEvent: false });
      });

    this.subs.add(sub);
  }
}
