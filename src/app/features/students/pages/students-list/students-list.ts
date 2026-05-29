import { CommonModule } from '@angular/common';
import { Component, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { LookupsService } from '../../../../core/services/lookups.service';
import { StudentsService } from '../../services/students';
import { Student } from '../../models/student.model';
import { StudentFormDialog } from '../../components/student-form-dialog/student-form-dialog';

interface PaymentOption {
  value: 'all' | 'payé' | 'en retard';
  label: string;
}

@Component({
  selector: 'app-students-list',
  standalone: true,
  imports: [
    CommonModule,
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
    MatProgressSpinnerModule,
    MatTableModule,
    MatSnackBarModule,
  ],
  templateUrl: './students-list.html',
  styleUrls: ['./students-list.scss'],
})
export class StudentsList {
  private readonly studentsService = inject(StudentsService);
  private readonly lookups = inject(LookupsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly students = signal<Student[]>([]);
  readonly loading = signal(true);
  private readonly searchSignal = signal('');
  private readonly statusSignal = signal<'all' | 'payé' | 'en retard'>('all');
  private readonly levelSignal = signal<'all' | string>('all');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  get search() {
    return this.searchSignal();
  }

  set search(value: string) {
    this.searchSignal.set(value);
    this.pageIndex.set(0);
  }

  get statusFilter() {
    return this.statusSignal();
  }

  set statusFilter(value: 'all' | 'payé' | 'en retard') {
    this.statusSignal.set(value);
    this.pageIndex.set(0);
  }

  get levelFilter() {
    return this.levelSignal();
  }

  set levelFilter(value: 'all' | string) {
    this.levelSignal.set(value);
    this.pageIndex.set(0);
  }

  readonly paymentOptions: PaymentOption[] = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'payé', label: 'Payé' },
    { value: 'en retard', label: 'En retard' },
  ];

  readonly displayedColumns = [
    'avatar',
    'schoolLevel',
    'paymentStatus',
    'attendanceRate',
    'actions',
  ];
  readonly pageSizeOptions = [5, 10, 20];

  readonly filteredStudents = computed(() => {
    const query = this.search.trim().toLowerCase();
    const status = this.statusFilter;
    const level = this.levelFilter;

    return this.students().filter((student) => {
      const matchesStatus = status === 'all' || student.paymentStatus === status;
      const matchesLevel = level === 'all' || student.schoolLevel === level;
      const matchesSearch = !query || student.fullName.toLowerCase().includes(query);
      return matchesStatus && matchesLevel && matchesSearch;
    });
  });

  readonly pagedStudents = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredStudents().slice(start, end);
  });

  readonly schoolLevels = computed(() =>
    this.lookups.withLegacyNames(
      this.lookups.levelNames(),
      this.students().map((student) => student.schoolLevel),
    ),
  );

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredStudents().length / this.pageSize())),
  );

  constructor() {
    this.lookups.ensureLevels().subscribe();
    this.loadStudents();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(StudentFormDialog, {
      width: '820px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {},
    });

    dialogRef.afterClosed().subscribe((result: { created: true } | undefined) => {
      if (result?.created) {
        this.loadStudents();
      }
    });
  }

  openEditDialog(student: Student): void {
    const dialogRef = this.dialog.open(StudentFormDialog, {
      width: '820px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { student },
    });

    dialogRef.afterClosed().subscribe((result: { updated: true } | undefined) => {
      if (result?.updated) {
        this.loadStudents();
      }
    });
  }

  trackById(index: number, student: Student) {
    return student.id;
  }

  getAvatarUrl(student: Student): string {
    return (
      student.photo ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fullName)}&background=3f51b5&color=fff`
    );
  }

  loadStudents(): void {
    this.loading.set(true);
    this.studentsService.getStudents().subscribe({
      next: (students) => {
        this.students.set(students || []);
      },
      error: () => {
        this.students.set([]);
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  clearSearch(): void {
    this.search = '';
    this.pageIndex.set(0);
  }

  changeStatus(value: 'all' | 'payé' | 'en retard'): void {
    this.statusFilter = value;
    this.pageIndex.set(0);
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  paymentChipClass(status: string): string {
    const map: Record<string, string> = {
      'payé':       'chip-paid',
      'en attente': 'chip-pending',
      'en retard':  'chip-late',
    };
    return map[status] ?? 'chip-pending';
  }

  deleteStudent(student: Student): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        title: 'Supprimer l\'étudiant',
        message: `Êtes-vous sûr de vouloir supprimer ${student.fullName} ? Cette action est irréversible.`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) return;

      this.loading.set(true);
      this.studentsService.deleteStudent(student.id).subscribe({
        next: () => {
          this.snackBar.open('Étudiant supprimé.', 'Fermer', { duration: 3000 });
          this.loadStudents();
        },
        error: () => {
          this.snackBar.open('Impossible de supprimer l\'étudiant.', 'Fermer', { duration: 3000 });
          this.loading.set(false);
        },
        complete: () => {
          this.loading.set(false);
        },
      });
    });
  }
}
