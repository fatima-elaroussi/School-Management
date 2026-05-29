import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { LevelFormDialog } from '../../components/level-form-dialog/level-form-dialog';
import { LevelsService } from '../../services/levels';
import { SchoolLevel } from '../../level.model';

type LevelCategory = 'all' | 'primaire' | 'collège' | 'lycée';

@Component({
  selector: 'app-levels-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
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
  templateUrl: './levels-list.html',
  styleUrls: ['./levels-list.scss'],
})
export class LevelsList {
  private readonly levelsService = inject(LevelsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly levels = signal<SchoolLevel[]>([]);
  readonly searchSignal = signal('');
  readonly categorySignal = signal<LevelCategory>('all');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly dataSource = new MatTableDataSource<SchoolLevel>([]);

  readonly displayColumns = ['name', 'category', 'description', 'actions'];
  readonly pageSizeOptions = [5, 10, 20];
  readonly categoryOptions = [
    { value: 'all' as LevelCategory, label: 'Toutes les catégories' },
    { value: 'primaire' as LevelCategory, label: 'Primaire' },
    { value: 'collège' as LevelCategory, label: 'Collège' },
    { value: 'lycée' as LevelCategory, label: 'Lycée' },
  ];

  get search() {
    return this.searchSignal();
  }

  set search(value: string) {
    this.searchSignal.set(value);
    this.pageIndex.set(0);
    this.updateTableData();
  }

  get categoryFilter() {
    return this.categorySignal();
  }

  set categoryFilter(value: LevelCategory) {
    this.categorySignal.set(value);
    this.pageIndex.set(0);
    this.updateTableData();
  }

  readonly filteredLevels = computed(() => {
    const query = this.search.trim().toLowerCase();
    const category = this.categoryFilter;

    return this.levels().filter((level) => {
      const matchesQuery =
        !query ||
        level.name.toLowerCase().includes(query) ||
        level.category.toLowerCase().includes(query) ||
        (level.description ?? '').toLowerCase().includes(query);

      const matchesCategory = category === 'all' || level.category === category;

      return matchesQuery && matchesCategory;
    });
  });

  readonly pagedLevels = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredLevels().slice(start, start + this.pageSize());
  });

  readonly totalLevels = computed(() => this.filteredLevels().length);

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.totalLevels() / this.pageSize())));

  constructor() {
    this.loadLevels();
  }

  loadLevels(): void {
    this.loading.set(true);

    this.levelsService.getLevels().subscribe({
      next: (levels) => {
        this.levels.set(levels ?? []);
        this.pageIndex.set(0);
        this.updateTableData();
      },
      error: () => {
        this.levels.set([]);
        this.dataSource.data = [];
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  private updateTableData(): void {
    this.dataSource.data = this.pagedLevels();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.updateTableData();
  }

  trackById(_index: number, level: SchoolLevel): number {
    return level.id;
  }

  openLevelDialog(level?: SchoolLevel): void {
    const dialogRef = this.dialog.open(LevelFormDialog, {
      width: '540px',
      data: { level },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.saved) {
        this.loadLevels();
      }
    });
  }

  deleteLevel(level: SchoolLevel): void {
    const confirmDialogRef = this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        title: 'Supprimer le niveau',
        message: `Êtes-vous sûr de vouloir supprimer “${level.name}” ? Cette action est irréversible.`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
      },
    });

    confirmDialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.loading.set(true);
      this.levelsService.deleteLevel(level.id).subscribe({
        next: () => {
          this.snackBar.open('Niveau supprimé.', 'Fermer', { duration: 3000 });
          this.loadLevels();
        },
        error: () => {
          this.snackBar.open('Impossible de supprimer le niveau.', 'Fermer', {
            duration: 3000,
          });
          this.loading.set(false);
        },
      });
    });
  }
}
