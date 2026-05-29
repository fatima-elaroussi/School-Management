import { CommonModule, NgIf, NgForOf } from '@angular/common';
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { SubjectFormDialog } from '../../components/subject-form-dialog/subject-form-dialog';
import { LookupsService } from '../../../../core/services/lookups.service';
import { SubjectsService } from '../../services/subjects';
import { Subject as SubjectModel } from '../../subject.model';

@Component({
  selector: 'app-subjects-list',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgForOf,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './subjects-list.html',
  styleUrls: ['./subjects-list.scss'],
})
export class SubjectsList {
  private readonly subjectsService = inject(SubjectsService);
  private readonly lookups = inject(LookupsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly subjects = signal<SubjectModel[]>([]);
  readonly levels = this.lookups.levels;
  readonly searchSignal = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly dataSource = new MatTableDataSource<SubjectModel>([]);

  readonly displayColumns = ['name', 'schoolLevels', 'color', 'actions'];
  readonly pageSizeOptions = [5, 10, 20];

  get search() {
    return this.searchSignal();
  }

  set search(value: string) {
    this.searchSignal.set(value);
    this.pageIndex.set(0);
    this.updateTableData();
  }

  readonly levelNameMap = this.lookups.levelNameById;

  readonly filteredSubjects = computed(() => {
    const query = this.search.trim().toLowerCase();

    return this.subjects().filter((subject) => {
      const matchesName = !query || subject.name.toLowerCase().includes(query);
      const matchesColor = !query || subject.color?.toLowerCase().includes(query);
      const matchesLevel =
        !query ||
        subject.schoolLevels.some((levelId) =>
          this.getSchoolLevelName(levelId).toLowerCase().includes(query),
        );

      return matchesName || matchesColor || matchesLevel;
    });
  });

  readonly pagedSubjects = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredSubjects().slice(start, start + this.pageSize());
  });

  readonly totalSubjects = computed(() => this.filteredSubjects().length);

  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.totalSubjects() / this.pageSize())),
  );

  constructor() {
    this.lookups.ensureLevels().subscribe();
    this.loadSubjects();
  }

  loadSubjects(): void {
    this.loading.set(true);
    this.subjectsService.getSubjects().subscribe({
      next: (subjects) => {
        this.subjects.set(subjects ?? []);
        this.pageIndex.set(0);
        this.updateTableData();
      },
      error: () => {
        this.subjects.set([]);
        this.dataSource.data = [];
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  private updateTableData(): void {
    const total = this.filteredSubjects().length;
    const maxPage = Math.max(0, Math.ceil(total / this.pageSize()) - 1);
    if (this.pageIndex() > maxPage) {
      this.pageIndex.set(maxPage);
    }

    this.dataSource.data = this.pagedSubjects();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.updateTableData();
  }

  clearSearch(): void {
    this.search = '';
  }

  trackById(_index: number, subject: SubjectModel): number {
    return subject.id;
  }

  getSchoolLevelName(levelId: number): string {
    return this.lookups.getLevelName(levelId);
  }

  mapSchoolLevelNames(levelIds: number[]): string[] {
    return levelIds.map((levelId) => this.getSchoolLevelName(levelId));
  }

  getColorChipStyles(rawColor?: string) {
    const color = rawColor?.trim() || '#90a4ae';
    const normalized = color.startsWith('#') ? color : `#${color}`;
    const isLight = this.isColorLight(normalized);
    return {
      'background-color': normalized,
      color: isLight ? '#12202d' : '#ffffff',
      'border-color': '#e0e0e0',
    };
  }

  private isColorLight(color: string): boolean {
    const cleaned = color.replace('#', '');
    if (cleaned.length !== 6) {
      return false;
    }
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 > 186;
  }

  openSubjectDialog(subject?: SubjectModel): void {
    const dialogRef = this.dialog.open(SubjectFormDialog, {
      width: '560px',
      data: { subject },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.saved) {
        this.loadSubjects();
      }
    });
  }

  deleteSubject(subject: SubjectModel): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        title: 'Supprimer la matière',
        message: `Supprimer "${subject.name}" ? Cette action est irréversible.`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.loading.set(true);
      this.subjectsService.deleteSubject(subject.id).subscribe({
        next: () => {
          this.snackBar.open('Matière supprimée.', 'Fermer', {
            duration: 3000,
          });
          this.loadSubjects();
        },
        error: () => {
          this.snackBar.open('Impossible de supprimer la matière.', 'Fermer', {
            duration: 3000,
          });
          this.loading.set(false);
        },
      });
    });
  }
}
