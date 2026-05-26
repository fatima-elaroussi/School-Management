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
import { LevelsService } from '../../services/levels';
import { SchoolLevel } from '../../level.model';

interface LevelDialogData {
  level?: SchoolLevel;
}

@Component({
  selector: 'app-level-form-dialog',
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
    <div class="dialog-shell">
      <div class="dialog-header">
        <div>
          <p class="eyebrow">Level details</p>
          <h2>{{ title }}</h2>
          <p>
            Enter the school level name, choose a category, and provide a short description for
            better visibility.
          </p>
        </div>
        <button mat-icon-button aria-label="Close dialog" type="button" (click)="cancel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form class="dialog-form" [formGroup]="form">
        <mat-form-field appearance="fill" class="field-full">
          <mat-label>Level name</mat-label>
          <input matInput formControlName="name" />
          <mat-error *ngIf="controls.name.invalid">{{ getErrorMessage('name') }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill" class="field-full">
          <mat-label>Category</mat-label>
          <mat-select formControlName="category">
            <mat-option *ngFor="let option of categoryOptions" [value]="option.value">
              {{ option.label }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="controls.category.invalid">{{ getErrorMessage('category') }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill" class="field-full">
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
            {{ isEditMode ? 'Save changes' : 'Create level' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .dialog-shell {
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
        font-size: 1.65rem;
      }

      .dialog-header .eyebrow {
        margin: 0;
        font-size: 0.75rem;
        color: #5f6370;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .dialog-header p {
        margin: 0;
        color: #505763;
        line-height: 1.65;
      }

      .dialog-form {
        display: grid;
        gap: 18px;
      }

      .field-full {
        width: 100%;
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

      @media screen and (max-width: 620px) {
        .dialog-header {
          flex-direction: column;
          align-items: stretch;
        }

        .dialog-actions {
          justify-content: stretch;
        }
      }
    `,
  ],
})
export class LevelFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<LevelFormDialog>);
  private readonly levelsService = inject(LevelsService);
  private readonly snackBar = inject(MatSnackBar);
  readonly data = inject(MAT_DIALOG_DATA) as LevelDialogData | null;

  readonly isEditMode = Boolean(this.data?.level);
  readonly saveLoading = signal(false);

  readonly categoryOptions = [
    { value: 'primaire' as SchoolLevel['category'], label: 'Primaire' },
    { value: 'collège' as SchoolLevel['category'], label: 'Collège' },
    { value: 'lycée' as SchoolLevel['category'], label: 'Lycée' },
  ];

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.level?.name ?? '', [Validators.required, Validators.minLength(2)]],
    category: [this.data?.level?.category ?? 'primaire', [Validators.required]],
    description: [this.data?.level?.description ?? ''],
  });

  get title(): string {
    return this.isEditMode ? 'Edit school level' : 'Create school level';
  }

  get controls() {
    return this.form.controls;
  }

  getErrorMessage(controlName: keyof typeof this.form.controls): string {
    const control = this.form.controls[controlName];

    if (control.hasError('required')) {
      return 'This field is required.';
    }

    if (controlName === 'name' && control.hasError('minlength')) {
      return 'Level name must be at least 2 characters.';
    }

    return 'Please correct this field.';
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please complete the form before saving.', 'Close', {
        duration: 3000,
      });
      return;
    }

    const payload = {
      name: this.form.controls.name.value.trim(),
      category: this.form.controls.category.value,
      description: this.form.controls.description.value.trim(),
    };

    this.saveLoading.set(true);

    const action =
      this.isEditMode && this.data?.level
        ? this.levelsService.updateLevel(this.data.level.id, payload)
        : this.levelsService.createLevel(payload);

    action.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEditMode ? 'Level updated successfully.' : 'Level created successfully.',
          'Close',
          { duration: 3000 },
        );
        this.dialogRef.close({ saved: true });
      },
      error: () => {
        this.snackBar.open('Unable to save level. Please try again.', 'Close', {
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
