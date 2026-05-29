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
    <div class="subject-dialog">

      <header class="dialog-header">
        <div class="header-content">
          <div class="header-icon"><mat-icon>menu_book</mat-icon></div>
          <div>
            <p class="eyebrow">Programme · Matières</p>
            <h2 class="dialog-title">{{ title }}</h2>
            <p class="dialog-subtitle">
              {{ isEditMode
                ? 'Modifiez les informations de cette matière.'
                : 'Ajoutez une matière en définissant ses niveaux et sa couleur d\'identification.' }}
            </p>
          </div>
        </div>
        <button mat-icon-button type="button" class="close-btn" (click)="cancel()">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <form class="dialog-form" [formGroup]="form" (ngSubmit)="save()">

        <div class="form-section">
          <p class="section-label"><mat-icon>info</mat-icon>Informations de la matière</p>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nom de la matière</mat-label>
            <mat-icon matPrefix>menu_book</mat-icon>
            <input matInput formControlName="name" placeholder="Ex : Mathématiques" />
            <mat-error *ngIf="controls.name.invalid">{{ getErrorMessage('name') }}</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Niveaux scolaires</mat-label>
            <mat-icon matPrefix>layers</mat-icon>
            <mat-select formControlName="schoolLevels" multiple>
              <mat-option *ngFor="let level of levels()" [value]="level.id">{{ level.name }}</mat-option>
            </mat-select>
            <mat-error *ngIf="controls.schoolLevels.invalid">{{ getErrorMessage('schoolLevels') }}</mat-error>
          </mat-form-field>
        </div>

        <div class="form-section">
          <p class="section-label"><mat-icon>palette</mat-icon>Apparence</p>

          <div class="color-row">
            <mat-form-field appearance="outline">
              <mat-label>Couleur d'identification</mat-label>
              <mat-icon matPrefix>color_lens</mat-icon>
              <input matInput type="color" formControlName="color" />
              <mat-error *ngIf="controls.color.invalid">{{ getErrorMessage('color') }}</mat-error>
            </mat-form-field>
            <div class="color-swatch" [style.background]="controls.color.value">
              <span class="color-label">{{ controls.color.value }}</span>
            </div>
          </div>
        </div>

        <div class="form-section">
          <p class="section-label">
            <mat-icon>notes</mat-icon>Description
            <span class="section-optional">(optionnel)</span>
          </p>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3"
              placeholder="Brève description de la matière…"></textarea>
          </mat-form-field>
        </div>

        <footer class="dialog-footer">
          <button mat-stroked-button type="button" (click)="cancel()">Annuler</button>
          <button mat-flat-button color="primary" type="submit" class="save-btn" [disabled]="saveLoading()">
            <mat-progress-spinner *ngIf="saveLoading()" diameter="18" mode="indeterminate" />
            <mat-icon *ngIf="!saveLoading()">{{ isEditMode ? 'save' : 'add_circle' }}</mat-icon>
            <span>{{ isEditMode ? 'Enregistrer les modifications' : 'Créer la matière' }}</span>
          </button>
        </footer>

      </form>
    </div>
  `,
  styles: [`
    .subject-dialog {
      display: flex; flex-direction: column;
      width: 100%; max-width: 560px; overflow: hidden;
    }
    .dialog-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 16px; padding: 28px 28px 22px;
      border-bottom: 1px solid rgba(30,60,100,0.09);
      background: linear-gradient(135deg, #ecfeff 0%, #cffafe 100%);
    }
    .header-content { display: flex; gap: 16px; align-items: flex-start; }
    .header-icon {
      flex-shrink: 0; width: 48px; height: 48px; border-radius: 14px;
      background: linear-gradient(135deg, #0891b2, #0e7490);
      display: grid; place-items: center;
      box-shadow: 0 4px 14px rgba(8,145,178,0.35);
    }
    .header-icon mat-icon { color: #fff; font-size: 22px; width: 22px; height: 22px; }
    .eyebrow { margin: 0 0 4px; font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; color: #7a8fa3; }
    .dialog-title { margin: 0 0 6px; font-size: 1.45rem; font-weight: 700; letter-spacing: -0.02em; color: #0d1f35; }
    .dialog-subtitle { margin: 0; font-size: 0.88rem; color: #3d5470; line-height: 1.5; }
    .close-btn { flex-shrink: 0; color: #7a8fa3; }
    .dialog-form { display: flex; flex-direction: column; overflow-y: auto; max-height: calc(90vh - 200px); }
    .form-section { display: grid; gap: 14px; padding: 22px 28px; }
    .form-section + .form-section { border-top: 1px solid rgba(30,60,100,0.07); }
    .section-label {
      display: flex; align-items: center; gap: 8px; margin: 0 0 2px;
      font-size: 0.78rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.1em; color: #7a8fa3;
    }
    .section-label mat-icon { font-size: 16px; width: 16px; height: 16px; color: #0891b2; }
    .section-optional { font-weight: 400; text-transform: none; letter-spacing: 0; color: #b0bec5; font-size: 0.75rem; }
    .full-width { width: 100%; }
    .color-row { display: grid; grid-template-columns: 1fr auto; gap: 14px; align-items: center; }
    .color-swatch {
      width: 80px; height: 52px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid rgba(0,0,0,0.08); flex-shrink: 0;
    }
    .color-label { font-size: 10px; font-weight: 600; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.4); }
    .dialog-footer {
      display: flex; justify-content: flex-end; align-items: center;
      gap: 12px; padding: 18px 28px 24px;
      border-top: 1px solid rgba(30,60,100,0.09);
      background: #fafcff; position: sticky; bottom: 0;
    }
    .save-btn {
      display: flex; align-items: center; gap: 8px;
      min-width: 220px; height: 42px;
      border-radius: 10px !important; font-weight: 600 !important;
    }
    .save-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .save-btn mat-progress-spinner { --mdc-circular-progress-active-indicator-color: #fff; }
    @media (max-width: 600px) {
      .dialog-header { padding: 20px 16px 16px; }
      .form-section { padding: 18px 16px; }
      .dialog-footer { padding: 14px 16px 20px; }
      .color-row { grid-template-columns: 1fr; }
      .header-content { flex-direction: column; gap: 10px; }
      .save-btn { min-width: unset; flex: 1; }
    }
  `],
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
    return this.isEditMode ? 'Modifier la matière' : 'Nouvelle matière';
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
      return 'Ce champ est obligatoire.';
    }
    if (controlName === 'name' && control.hasError('minlength')) {
      return 'Le nom doit contenir au moins 2 caractères.';
    }
    return 'Veuillez corriger ce champ.';
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Veuillez corriger les erreurs avant d\'enregistrer.', 'Fermer', {
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
          this.isEditMode ? 'Matière modifiée avec succès.' : 'Matière créée avec succès.',
          'Fermer',
          { duration: 3000 },
        );
        this.dialogRef.close({ saved: true });
      },
      error: () => {
        this.snackBar.open('Impossible d\'enregistrer la matière.', 'Fermer', {
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
