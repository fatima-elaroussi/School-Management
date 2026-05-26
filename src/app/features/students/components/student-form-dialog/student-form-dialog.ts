import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LookupsService } from '../../../../core/services/lookups.service';
import { nonEmptyArray } from '../../../../core/validators/array.validators';
import { Student } from '../../models/student.model';
import { StudentsService } from '../../services/students';

interface StudentDialogData {
  student?: Student;
}

@Component({
  selector: 'app-student-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './student-form-dialog.html',
  styleUrls: ['./student-form-dialog.scss'],
})
export class StudentFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<StudentFormDialog>);
  private readonly studentsService = inject(StudentsService);
  private readonly lookups = inject(LookupsService);
  private readonly snackBar = inject(MatSnackBar);
  readonly data = inject(MAT_DIALOG_DATA) as StudentDialogData | null;

  readonly imagePreview = signal<string | null>(this.data?.student?.photo ?? null);
  readonly saveLoading = signal(false);
  readonly isEditMode = Boolean(this.data?.student);
  readonly lookupsLoading = this.lookups.anyLoading;

  readonly levelNames = computed(() =>
    this.lookups.withLegacyNames(this.lookups.levelNames(), this.data?.student?.schoolLevel),
  );

  readonly subjectNames = computed(() =>
    this.lookups.withLegacyNames(this.lookups.subjectNames(), this.data?.student?.subjects),
  );

  readonly paymentStatusOptions = [
    { value: 'payé', label: 'Payé' },
    { value: 'en retard', label: 'En retard' },
  ];

  private readonly fieldLabels: Record<string, string> = {
    fullName: 'Full name',
    phone: 'Phone',
    parentPhone: 'Parent phone',
    address: 'Address',
    schoolLevel: 'School level',
    subjects: 'Subjects',
    groups: 'Groups',
    monthlyPayment: 'Monthly payment',
    paymentStatus: 'Payment status',
  };

  readonly form = this.fb.nonNullable.group({
    fullName: [this.data?.student?.fullName ?? '', [Validators.required, Validators.minLength(3)]],
    phone: [
      this.data?.student?.phone ?? '',
      [Validators.required, Validators.pattern(/^[0-9+\s-]{8,20}$/)],
    ],
    parentPhone: [
      this.data?.student?.parentPhone ?? '',
      [Validators.required, Validators.pattern(/^[0-9+\s-]{8,20}$/)],
    ],
    address: [this.data?.student?.address ?? '', [Validators.required]],
    schoolLevel: [this.data?.student?.schoolLevel ?? '', [Validators.required]],
    subjects: [this.data?.student?.subjects ?? [], [nonEmptyArray]],
    groups: [this.data?.student?.groups?.join(', ') ?? '', [Validators.required]],
    monthlyPayment: [
      this.data?.student?.monthlyPayment ?? 0,
      [Validators.required, Validators.min(1)],
    ],
    paymentStatus: [this.data?.student?.paymentStatus ?? 'payé', [Validators.required]],
    notes: [this.data?.student?.notes ?? ''],
    photo: [this.data?.student?.photo ?? ''],
  });

  constructor() {
    this.lookups.preloadAll().subscribe();
  }

  get controls() {
    return this.form.controls;
  }

  private getInvalidControlLabels(): string[] {
    return Object.entries(this.form.controls)
      .filter(([, control]) => control.invalid)
      .map(([name]) => this.fieldLabels[name] ?? name);
  }

  get hasPhoto(): boolean {
    return Boolean(this.imagePreview());
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const invalidFields = this.getInvalidControlLabels();
      const message = invalidFields.length
        ? `Please fix: ${invalidFields.join(', ')}.`
        : 'Please complete all required fields before saving.';

      this.snackBar.open(message, 'Close', {
        duration: 3000,
      });
      return;
    }

    const value = this.form.getRawValue();
    const payload: Omit<Student, 'id'> = {
      fullName: value.fullName.trim(),
      phone: value.phone.trim(),
      parentPhone: value.parentPhone.trim(),
      address: value.address.trim(),
      schoolLevel: value.schoolLevel.trim(),
      subjects: [...value.subjects],
      groups: value.groups
        .split(',')
        .map((item: string) => item.trim())
        .filter(Boolean),
      registrationDate:
        this.data?.student?.registrationDate ?? new Date().toISOString().slice(0, 10),
      monthlyPayment: Number(value.monthlyPayment),
      paymentStatus: value.paymentStatus as 'payé' | 'en retard',
      notes: value.notes.trim(),
      photo: this.imagePreview() ?? '',
      attendanceRate: this.data?.student?.attendanceRate ?? 0,
    };

    if (this.isEditMode && this.data?.student) {
      this.saveLoading.set(true);
      this.studentsService.updateStudent(this.data.student.id, payload).subscribe({
        next: () => {
          this.snackBar.open('Student updated successfully.', 'Close', {
            duration: 3000,
          });
          this.dialogRef.close({ updated: true });
        },
        error: () => {
          this.snackBar.open('Unable to update student. Please try again.', 'Close', {
            duration: 3000,
          });
          this.saveLoading.set(false);
        },
        complete: () => {
          this.saveLoading.set(false);
        },
      });
      return;
    }

    this.saveLoading.set(true);
    this.studentsService.createStudent(payload).subscribe({
      next: () => {
        this.snackBar.open('Student created successfully.', 'Close', {
          duration: 3000,
        });
        this.dialogRef.close({ created: true });
      },
      error: () => {
        this.snackBar.open('Unable to create student. Please try again.', 'Close', {
          duration: 3000,
        });
        this.saveLoading.set(false);
      },
      complete: () => {
        this.saveLoading.set(false);
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  onImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview.set(reader.result as string);
      this.form.patchValue({ photo: reader.result as string });
    };
    reader.readAsDataURL(file);
  }
}
