import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LookupsService } from '../../../../core/services/lookups.service';
import { SubjectsService } from '../../services/subjects';
import { Subject as SubjectModel } from '../../subject.model';

interface SubjectDialogData {
  subject?: SubjectModel;
}

@Component({
  selector: 'app-subject-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="subject-dialog-shell">
      <div class="dialog-header">
        <div>
          <p class="eyebrow">Subject details</p>
          <h2>{{ title }}</h2>
          <p>Assign the subject to school levels and pick a color for fast recognition.</p>
        </div>
        <button mat-icon-button aria-label="Close dialog" type="button" (click)="cancel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form class="subject-dialog-form" [formGroup]="form">
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Subject name</mat-label>
          <input matInput formControlName="name" />
          <mat-error *ngIf="controls.name.invalid">{{ getErrorMessage('name') }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill" class="full-width">
          <mat-label>School levels</mat-label>
          <mat-select formControlName="schoolLevels" multiple>
            <mat-option *ngFor="let level of levels()" [value]="level.id">{{
              level.name
            }}</mat-option>
          </mat-select>
          <mat-error *ngIf="controls.schoolLevels.invalid">{{
            getErrorMessage('schoolLevels')
          }}</mat-error>
        </mat-form-field>

        <div class="color-row">
          <mat-form-field appearance="fill" class="color-field">
            <mat-label>Color</mat-label>
            <input matInput type="color" formControlName="color" />
            <mat-error *ngIf="controls.color.invalid">{{ getErrorMessage('color') }}</mat-error>
          </mat-form-field>
          <div class="color-preview" [ngStyle]="{ 'background-color': controls.color.value }">
            <span>{{ controls.color.value }}</span>
          </div>
        </div>

        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="4"></textarea>
        </mat-form-field>

        <div class="dialog-actions">
          <button mat-button type="button" (click)="cancel()">Cancel</button>
          <button
            mat-flat-button
            color="primary"
            type="button"
            [disabled]="saveLoading()"
            (click)="save()"
          >
            <mat-progress-spinner
              *ngIf="saveLoading()"
              diameter="18"
              mode="indeterminate"
            ></mat-progress-spinner>
            {{ isEditMode ? 'Save subject' : 'Create subject' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .subject-dialog-shell {
        display: grid;
        gap: 20px;
        max-width: 100%;
      }

      .dialog-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      .dialog-header h2 {
        margin: 0.35rem 0 0.5rem;
        font-size: 1.6rem;
      }

      .dialog-header .eyebrow {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: #5f6370;
        font-size: 0.75rem;
      }

      .dialog-header p {
        margin: 0;
        color: #505763;
        line-height: 1.6;
      }

      .subject-dialog-form {
        display: grid;
        gap: 18px;
      }

      .full-width {
        width: 100%;
      }

      .color-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 16px;
        align-items: center;
      }

      .color-field {
        width: 100%;
      }

      .color-preview {
        min-width: 120px;
        min-height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 16px;
        color: #ffffff;
        font-weight: 600;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        flex-wrap: wrap;
      }

      mat-progress-spinner {
        margin-right: 8px;
      }

      @media screen and (max-width: 660px) {
        .color-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SubjectFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<SubjectFormDialog>);
  private readonly subjectsService = inject(SubjectsService);
  private readonly lookups = inject(LookupsService);
  private readonly snackBar = inject(MatSnackBar);
  readonly data = inject(MAT_DIALOG_DATA) as SubjectDialogData | null;

  readonly isEditMode = Boolean(this.data?.subject);
  readonly saveLoading = signal(false);
  readonly levels = this.lookups.levels;

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.subject?.name ?? '', [Validators.required, Validators.minLength(2)]],
    schoolLevels: [this.data?.subject?.schoolLevels ?? [], [Validators.required]],
    color: [this.data?.subject?.color ?? '#4caf50', [Validators.required]],
    description: [this.data?.subject?.description ?? ''],
  });

  get title(): string {
    return this.isEditMode ? 'Edit subject' : 'Create subject';
  }

  get controls() {
    return this.form.controls;
  }

  constructor() {
    this.lookups.ensureLevels().subscribe();
  }

  getErrorMessage(controlName: keyof typeof this.form.controls): string {
    const control = this.form.controls[controlName];
    if (control.hasError('required')) {
      return 'This field is required.';
    }
    if (controlName === 'name' && control.hasError('minlength')) {
      return 'Subject name must be at least 2 characters.';
    }
    return 'Please correct the field.';
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please fix any errors before saving.', 'Close', {
        duration: 3000,
      });
      return;
    }

    const formValue = this.form.getRawValue();
    const payload: Omit<SubjectModel, 'id'> = {
      name: formValue.name.trim(),
      schoolLevels: formValue.schoolLevels,
      color: formValue.color,
      description: formValue.description?.trim(),
    };

    this.saveLoading.set(true);
    const action =
      this.isEditMode && this.data?.subject
        ? this.subjectsService.updateSubject(this.data.subject.id, payload)
        : this.subjectsService.createSubject(payload);

    action.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEditMode ? 'Subject saved successfully.' : 'Subject created successfully.',
          'Close',
          { duration: 3000 },
        );
        this.dialogRef.close({ saved: true });
      },
      error: () => {
        this.snackBar.open('Unable to save subject. Please try again.', 'Close', {
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
