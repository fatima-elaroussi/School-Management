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
    <div class="level-dialog">

      <header class="dialog-header">
        <div class="header-content">
          <div class="header-icon"><mat-icon>school</mat-icon></div>
          <div>
            <p class="eyebrow">Niveaux scolaires · Organisation</p>
            <h2 class="dialog-title">{{ title }}</h2>
            <p class="dialog-subtitle">
              {{ isEditMode
                ? 'Modifiez les informations de ce niveau scolaire.'
                : 'Créez un nouveau niveau en définissant son nom et sa catégorie.' }}
            </p>
          </div>
        </div>
        <button mat-icon-button type="button" class="close-btn" (click)="cancel()">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <form class="dialog-form" [formGroup]="form" (ngSubmit)="save()">

        <div class="form-section">
          <p class="section-label"><mat-icon>info</mat-icon>Informations du niveau</p>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nom du niveau</mat-label>
            <mat-icon matPrefix>layers</mat-icon>
            <input matInput formControlName="name" placeholder="Ex : 2ème année bac" />
            <mat-error *ngIf="controls.name.invalid">{{ getErrorMessage('name') }}</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Catégorie</mat-label>
            <mat-icon matPrefix>category</mat-icon>
            <mat-select formControlName="category">
              <mat-option *ngFor="let opt of categoryOptions" [value]="opt.value">
                {{ opt.label }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="controls.category.invalid">{{ getErrorMessage('category') }}</mat-error>
          </mat-form-field>
        </div>

        <div class="form-section">
          <p class="section-label">
            <mat-icon>notes</mat-icon>Description
            <span class="section-optional">(optionnel)</span>
          </p>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3"
              placeholder="Courte description du niveau…"></textarea>
          </mat-form-field>
        </div>

        <footer class="dialog-footer">
          <button mat-stroked-button type="button" (click)="cancel()">Annuler</button>
          <button mat-flat-button color="primary" type="submit" class="save-btn" [disabled]="saveLoading()">
            <mat-progress-spinner *ngIf="saveLoading()" diameter="18" mode="indeterminate" />
            <mat-icon *ngIf="!saveLoading()">{{ isEditMode ? 'save' : 'add_circle' }}</mat-icon>
            <span>{{ isEditMode ? 'Enregistrer les modifications' : 'Créer le niveau' }}</span>
          </button>
        </footer>

      </form>
    </div>
  `,
  styles: [`
    .level-dialog {
      display: flex; flex-direction: column;
      width: 100%; max-width: 560px; overflow: hidden;
    }
    .dialog-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 16px; padding: 28px 28px 22px;
      border-bottom: 1px solid rgba(30,60,100,0.09);
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    }
    .header-content { display: flex; gap: 16px; align-items: flex-start; }
    .header-icon {
      flex-shrink: 0; width: 48px; height: 48px; border-radius: 14px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      display: grid; place-items: center;
      box-shadow: 0 4px 14px rgba(37,99,235,0.35);
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
    .section-label mat-icon { font-size: 16px; width: 16px; height: 16px; color: #2563eb; }
    .section-optional { font-weight: 400; text-transform: none; letter-spacing: 0; color: #b0bec5; font-size: 0.75rem; }
    .full-width { width: 100%; }
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
      .header-content { flex-direction: column; gap: 10px; }
      .save-btn { min-width: unset; flex: 1; }
    }
  `],
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
    return this.isEditMode ? 'Modifier le niveau' : 'Nouveau niveau scolaire';
  }

  get controls() {
    return this.form.controls;
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
      this.snackBar.open('Veuillez compléter le formulaire avant d\'enregistrer.', 'Fermer', {
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
          this.isEditMode ? 'Niveau modifié avec succès.' : 'Niveau créé avec succès.',
          'Fermer',
          { duration: 3000 },
        );
        this.dialogRef.close({ saved: true });
      },
      error: () => {
        this.snackBar.open('Impossible d\'enregistrer le niveau.', 'Fermer', {
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
