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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LookupsService } from '../../../../core/services/lookups.service';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { Teacher } from '../../../teachers/models/teacher.model';
import { TeachersService } from '../../../teachers/services/teachers';
import { GroupFormDialog } from '../../components/group-form-dialog/group-form-dialog';
import { Group, GroupSchedule } from '../../models/group.model';
import { GroupsService } from '../../services/groups';

type FilterValue = 'all' | number;

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './groups-list.html',
  styleUrls: ['./groups-list.scss'],
})
export class GroupsList {
  private readonly groupsService = inject(GroupsService);
  private readonly teachersService = inject(TeachersService);
  private readonly lookups = inject(LookupsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly groups = signal<Group[]>([]);
  readonly teachers = signal<Teacher[]>([]);
  readonly searchSignal = signal('');
  readonly subjectFilterSignal = signal<FilterValue>('all');
  readonly levelFilterSignal = signal<FilterValue>('all');
  readonly teacherFilterSignal = signal<FilterValue>('all');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly dataSource = new MatTableDataSource<Group>([]);

  readonly displayColumns = [
    'name',
    'subject',
    'schoolLevel',
    'teacher',
    'room',
    'studentsCount',
    'schedule',
    'actions',
  ];
  readonly pageSizeOptions = [5, 10, 20];

  get search() {
    return this.searchSignal();
  }

  set search(value: string) {
    this.searchSignal.set(value);
    this.pageIndex.set(0);
    this.updateTableData();
  }

  get subjectFilter() {
    return this.subjectFilterSignal();
  }

  set subjectFilter(value: FilterValue) {
    this.subjectFilterSignal.set(value);
    this.pageIndex.set(0);
    this.updateTableData();
  }

  get levelFilter() {
    return this.levelFilterSignal();
  }

  set levelFilter(value: FilterValue) {
    this.levelFilterSignal.set(value);
    this.pageIndex.set(0);
    this.updateTableData();
  }

  get teacherFilter() {
    return this.teacherFilterSignal();
  }

  set teacherFilter(value: FilterValue) {
    this.teacherFilterSignal.set(value);
    this.pageIndex.set(0);
    this.updateTableData();
  }

  readonly teacherNameById = computed(() =>
    Object.fromEntries(this.teachers().map((teacher) => [teacher.id, teacher.fullName] as const)),
  );

  readonly subjectFilterOptions = computed(() => [
    { value: 'all' as const, label: 'Toutes les matières' },
    ...this.lookups.subjectOptions(),
  ]);

  readonly levelFilterOptions = computed(() => [
    { value: 'all' as const, label: 'Tous les niveaux' },
    ...this.lookups.levelOptions(),
  ]);

  readonly teacherFilterOptions = computed(() => [
    { value: 'all' as const, label: 'Tous les professeurs' },
    ...this.teachers().map((teacher) => ({ value: teacher.id, label: teacher.fullName })),
  ]);

  readonly filteredGroups = computed(() => {
    const query = this.search.trim().toLowerCase();
    const subjectFilter = this.subjectFilterSignal();
    const levelFilter = this.levelFilterSignal();
    const teacherFilter = this.teacherFilterSignal();

    return this.groups().filter((group) => {
      const matchesSubject =
        subjectFilter === 'all' || Number(group.subjectId) === Number(subjectFilter);
      const matchesLevel =
        levelFilter === 'all' || Number(group.schoolLevelId) === Number(levelFilter);
      const matchesTeacher =
        teacherFilter === 'all' || Number(group.teacherId) === Number(teacherFilter);

      if (!matchesSubject || !matchesLevel || !matchesTeacher) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        group.name,
        group.room,
        this.getSubjectName(group.subjectId),
        this.getLevelName(group.schoolLevelId),
        this.getTeacherName(group.teacherId),
        this.formatSchedules(group.schedules),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  });

  readonly pagedGroups = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredGroups().slice(start, start + this.pageSize());
  });

  readonly totalGroups = computed(() => this.groups().length);
  readonly filteredCount = computed(() => this.filteredGroups().length);
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filteredCount() / this.pageSize())),
  );

  constructor() {
    this.lookups.preloadAll().subscribe();
    this.loadTeachers();
    this.loadGroups();
  }

  loadGroups(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.groupsService.getGroups().subscribe({
      next: (groups) => {
        this.groups.set(groups ?? []);
        this.pageIndex.set(0);
        this.updateTableData();
      },
      error: () => {
        this.groups.set([]);
        this.dataSource.data = [];
        this.loadError.set(true);
        this.loading.set(false);
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  private loadTeachers(): void {
    this.teachersService.getTeachers().subscribe({
      next: (teachers) => this.teachers.set(teachers ?? []),
      error: () => this.teachers.set([]),
    });
  }

  private updateTableData(): void {
    const total = this.filteredGroups().length;
    const maxPage = Math.max(0, Math.ceil(total / this.pageSize()) - 1);
    if (this.pageIndex() > maxPage) {
      this.pageIndex.set(maxPage);
    }
    this.dataSource.data = this.pagedGroups();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.updateTableData();
  }

  clearSearch(): void {
    this.search = '';
  }

  clearFilters(): void {
    this.subjectFilter = 'all';
    this.levelFilter = 'all';
    this.teacherFilter = 'all';
    this.search = '';
  }

  trackById(_index: number, group: Group): number {
    return group.id;
  }

  getSubjectName(subjectId: number): string {
    return this.lookups.getSubjectName(subjectId);
  }

  getLevelName(levelId: number): string {
    return this.lookups.getLevelName(levelId);
  }

  getTeacherName(teacherId: number): string {
    return this.teacherNameById()[teacherId] ?? `Teacher ${teacherId}`;
  }

  getStudentsLabel(group: Group): string {
    return `${group.studentIds.length} / ${group.maxStudents}`;
  }

  formatSchedules(schedules: GroupSchedule[]): string[] {
    return schedules.map((slot) => `${slot.day} ${slot.startTime}–${slot.endTime}`);
  }

  openGroupDialog(group?: Group): void {
    const dialogRef = this.dialog.open(GroupFormDialog, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { group },
    });

    dialogRef.afterClosed().subscribe((result: { saved: boolean } | undefined) => {
      if (result?.saved) {
        this.loadGroups();
      }
    });
  }

  deleteGroup(group: Group): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '420px',
      data: {
        title: 'Supprimer le groupe',
        message: `Supprimer “${group.name}” ? Cette action est irréversible.`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }

      this.loading.set(true);
      this.groupsService.deleteGroup(group.id).subscribe({
        next: () => {
          this.snackBar.open('Groupe supprimé.', 'Fermer', { duration: 3000 });
          this.loadGroups();
        },
        error: () => {
          this.snackBar.open('Impossible de supprimer le groupe.', 'Fermer', { duration: 3000 });
          this.loading.set(false);
        },
      });
    });
  }
}
