import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { TeachersService } from '../../services/teachers';
import { Teacher } from '../../models/teacher.model';

type SortField = 'fullName' | 'email' | 'phone' | 'salary' | 'paymentStatus';

type PaymentStatusFilter = 'all' | 'payé' | 'en attente';

@Component({
  selector: 'app-teachers-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  templateUrl: './teachers-list.html',
  styleUrls: ['./teachers-list.scss'],
})
export class TeachersList {
  private readonly teachersService = inject(TeachersService);

  readonly loading = signal(true);
  readonly teachers = signal<Teacher[]>([]);
  readonly searchSignal = signal('');
  readonly statusSignal = signal<PaymentStatusFilter>('all');
  readonly subjectSignal = signal('all');
  readonly sortFieldSignal = signal<SortField>('fullName');
  readonly sortDirectionSignal = signal<'asc' | 'desc'>('asc');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly dataSource = new MatTableDataSource<Teacher>([]);

  readonly displayColumns = [
    'avatar',
    'email',
    'phone',
    'subjects',
    'schoolLevels',
    'salary',
    'groups',
    'paymentStatus',
    'actions',
  ];

  readonly pageSizeOptions = [5, 10, 20];

  readonly statusOptions = [
    { value: 'all' as PaymentStatusFilter, label: 'All status' },
    { value: 'payé' as PaymentStatusFilter, label: 'Payé' },
    { value: 'en attente' as PaymentStatusFilter, label: 'En attente' },
  ];

  readonly sortOptions = [
    { value: 'fullName' as SortField, label: 'Name' },
    { value: 'email' as SortField, label: 'Email' },
    { value: 'phone' as SortField, label: 'Phone' },
    { value: 'salary' as SortField, label: 'Salary' },
    { value: 'paymentStatus' as SortField, label: 'Payment status' },
  ];

  get search() {
    return this.searchSignal();
  }

  set search(value: string) {
    this.searchSignal.set(value);
    this.pageIndex.set(0);
    this.updateTableData();
  }

  get statusFilter() {
    return this.statusSignal();
  }

  set statusFilter(value: PaymentStatusFilter) {
    this.statusSignal.set(value);
    this.pageIndex.set(0);
    this.updateTableData();
  }

  get subjectFilter() {
    return this.subjectSignal();
  }

  set subjectFilter(value: string) {
    this.subjectSignal.set(value);
    this.pageIndex.set(0);
    this.updateTableData();
  }

  get sortField() {
    return this.sortFieldSignal();
  }

  set sortField(value: SortField) {
    this.sortFieldSignal.set(value);
    this.updateTableData();
  }

  get sortDirection() {
    return this.sortDirectionSignal();
  }

  toggleSortDirection(): void {
    this.sortDirectionSignal.set(this.sortDirection === 'asc' ? 'desc' : 'asc');
    this.updateTableData();
  }

  readonly subjectOptions = computed(() => {
    const subjects = new Set<string>();
    this.teachers().forEach((teacher) => {
      teacher.subjects.forEach((subject) => subjects.add(subject));
    });
    return [...subjects].sort();
  });

  readonly filteredTeachers = computed(() => {
    const query = this.search.trim().toLowerCase();
    const status = this.statusFilter;
    const subject = this.subjectFilter;

    return this.teachers().filter((teacher) => {
      const matchesName = !query || teacher.fullName.toLowerCase().includes(query);
      const matchesStatus = status === 'all' || teacher.paymentStatus === status;
      const matchesSubject = subject === 'all' || teacher.subjects.includes(subject);
      return matchesName && matchesStatus && matchesSubject;
    });
  });

  readonly sortedTeachers = computed(() => {
    const teachers = [...this.filteredTeachers()];
    const field = this.sortField;
    const direction = this.sortDirection === 'asc' ? 1 : -1;

    return teachers.sort((a, b) => {
      const valueA = a[field];
      const valueB = b[field];

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return (valueA - valueB) * direction;
      }

      return String(valueA).localeCompare(String(valueB)) * direction;
    });
  });

  readonly pagedTeachers = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.sortedTeachers().slice(start, start + this.pageSize());
  });

  readonly totalTeachers = computed(() => this.filteredTeachers().length);

  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.totalTeachers() / this.pageSize())),
  );

  private readonly snackBar = inject(MatSnackBar);

  constructor() {
    this.loadTeachers();
  }

  loadTeachers(): void {
    this.loading.set(true);
    this.teachersService.getTeachers().subscribe({
      next: (teachers) => {
        this.teachers.set(teachers ?? []);
        this.updateTableData();
      },
      error: () => {
        this.teachers.set([]);
        this.dataSource.data = [];
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  private updateTableData(): void {
    this.dataSource.data = this.pagedTeachers();
  }

  deleteTeacher(teacher: Teacher): void {
    if (!confirm(`Delete ${teacher.fullName}?`)) {
      return;
    }

    this.loading.set(true);
    this.teachersService.deleteTeacher(teacher.id).subscribe({
      next: () => {
        this.teachers.update((list) => list.filter((item) => item.id !== teacher.id));
        this.updateTableData();
        this.pageIndex.set(0);
        this.snackBar.open('Teacher deleted successfully.', 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Unable to delete teacher. Please try again.', 'Close', {
          duration: 3000,
        });
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  getAvatarUrl(teacher: Teacher): string {
    return (
      teacher.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.fullName)}&background=3f51b5&color=fff`
    );
  }

  trackById(_: number, teacher: Teacher) {
    return teacher.id;
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.updateTableData();
  }
}
