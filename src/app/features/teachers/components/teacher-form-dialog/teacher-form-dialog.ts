import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
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
import { Teacher } from '../../models/teacher.model';
import { TeachersService } from '../../services/teachers';

interface TeacherDialogData {
  teacher?: Teacher;
}

@Component({
  selector: 'app-teacher-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './teacher-form-dialog.html',
  styleUrls: ['./teacher-form-dialog.scss'],
})
export class TeacherFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TeacherFormDialog>);
  private readonly teachersService = inject(TeachersService);
  private readonly snackBar = inject(MatSnackBar);
  readonly data = inject(MAT_DIALOG_DATA) as TeacherDialogData | null;

  readonly isEditMode = Boolean(this.data?.teacher);
  readonly saveLoading = signal(false);

  readonly subjectOptions = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'History',
    'Geography',
    'Languages',
    'Arts',
    'Physical Education',
  ];

  readonly schoolLevelOptions = [
    'Primary',
    'Middle School',
    'High School',
    'Vocational',
    'International',
  ];

  readonly paymentStatusOptions = [
    { value: 'payé', label: 'Payé' },
    { value: 'en attente', label: 'En attente' },
  ];

  readonly form = this.fb.nonNullable.group({
    fullName: [this.data?.teacher?.fullName ?? '', [Validators.required, Validators.minLength(3)]],
    email: [this.data?.teacher?.email ?? '', [Validators.required, Validators.email]],
    phone: [
      this.data?.teacher?.phone ?? '',
      [Validators.required, Validators.pattern(/^[0-9+\s-]{7,20}$/)],
    ],
    subjects: [this.data?.teacher?.subjects ?? [], [Validators.required]],
    schoolLevels: [this.data?.teacher?.schoolLevels ?? [], [Validators.required]],
    salary: [this.data?.teacher?.salary ?? 0, [Validators.required, Validators.min(0)]],
    groups: [this.data?.teacher?.groups?.join(', ') ?? '', [Validators.required]],
    paymentStatus: [this.data?.teacher?.paymentStatus ?? 'payé', [Validators.required]],
    notes: [this.data?.teacher?.notes ?? ''],
  });

  get controls() {
    return this.form.controls;
  }

  get title(): string {
    return this.isEditMode ? 'Edit teacher profile' : 'Create teacher profile';
  }

  getErrorMessage(controlName: keyof typeof this.form.controls): string {
    const control = this.form.controls[controlName];
    if (control.hasError('required')) {
      return 'This field is required.';
    }
    if (controlName === 'email' && control.hasError('email')) {
      return 'Enter a valid email address.';
    }
    if (controlName === 'fullName' && control.hasError('minlength')) {
      return 'Full name needs at least 3 characters.';
    }
    if (controlName === 'phone' && control.hasError('pattern')) {
      return 'Enter a valid phone number.';
    }
    if (controlName === 'salary' && control.hasError('min')) {
      return 'Salary must be 0 or higher.';
    }
    return 'Please correct the highlighted field.';
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please fix validation errors before saving.', 'Close', {
        duration: 3000,
      });
      return;
    }

    const value = this.form.getRawValue();
    const payload: Omit<Teacher, 'id'> = {
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      subjects: value.subjects,
      schoolLevels: value.schoolLevels,
      salary: Number(value.salary),
      groups: value.groups
        .split(',')
        .map((group) => group.trim())
        .filter(Boolean),
      hireDate: this.data?.teacher?.hireDate ?? new Date().toISOString().slice(0, 10),
      paymentStatus: value.paymentStatus,
      notes: value.notes?.trim() ?? '',
    };

    this.saveLoading.set(true);

    const action =
      this.isEditMode && this.data?.teacher
        ? this.teachersService.updateTeacher(this.data.teacher.id, payload)
        : this.teachersService.createTeacher(payload);

    action.subscribe({
      next: () => {
        const message = this.isEditMode
          ? 'Teacher updated successfully.'
          : 'Teacher created successfully.';
        this.snackBar.open(message, 'Close', { duration: 3000 });
        this.dialogRef.close({ saved: true });
      },
      error: () => {
        this.snackBar.open('Unable to save teacher. Please try again.', 'Close', {
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
}
