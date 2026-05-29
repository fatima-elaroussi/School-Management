import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LookupsService } from '../../../../core/services/lookups.service';
import { Teacher } from '../../../teachers/models/teacher.model';
import { TeachersService } from '../../../teachers/services/teachers';
import { Group, GroupDay } from '../../models/group.model';
import { GroupsService } from '../../services/groups';

interface GroupDialogData {
  group?: Group;
}

const DAYS: GroupDay[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

@Component({
  selector: 'app-group-form-dialog',
  standalone: true,
  imports: [
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
  templateUrl: './group-form-dialog.html',
  styleUrls: ['./group-form-dialog.scss'],
})
export class GroupFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<GroupFormDialog>);
  private readonly groupsService = inject(GroupsService);
  private readonly teachersService = inject(TeachersService);
  private readonly lookups = inject(LookupsService);
  private readonly snackBar = inject(MatSnackBar);
  readonly data = inject(MAT_DIALOG_DATA) as GroupDialogData | null;

  readonly isEditMode = Boolean(this.data?.group);
  readonly saveLoading = signal(false);
  readonly teachers = signal<Teacher[]>([]);
  readonly lookupsLoading = this.lookups.anyLoading;
  readonly days = DAYS;

  compareById = (a: number | string | null, b: number | string | null): boolean =>
    Number(a) === Number(b);

  readonly subjectOptions = this.lookups.subjectOptions;
  readonly levelOptions = this.lookups.levelOptions;

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.group?.name ?? '', [Validators.required, Validators.minLength(2)]],
    subjectId: [this.data?.group?.subjectId ?? null as number | null, [Validators.required]],
    schoolLevelId: [this.data?.group?.schoolLevelId ?? null as number | null, [Validators.required]],
    teacherId: [this.data?.group?.teacherId ?? null as number | null, [Validators.required]],
    room: [this.data?.group?.room ?? '', [Validators.required]],
    maxStudents: [
      this.data?.group?.maxStudents ?? 20,
      [Validators.required, Validators.min(1), Validators.max(100)],
    ],
    schedules: this.fb.array(
      (this.data?.group?.schedules?.length
        ? this.data.group.schedules
        : [{ day: 'Lundi' as GroupDay, startTime: '18:00', endTime: '20:00' }]
      ).map((slot) => this.createScheduleGroup(slot)),
    ),
  });

  get title(): string {
    return this.isEditMode ? 'Edit group' : 'Create group';
  }

  get scheduleControls() {
    return this.form.controls.schedules.controls;
  }

  constructor() {
    this.lookups.preloadAll().subscribe();
    this.teachersService.getTeachers().subscribe({
      next: (teachers) => this.teachers.set(teachers ?? []),
      error: () => this.teachers.set([]),
    });
  }

  addSchedule(): void {
    this.form.controls.schedules.push(
      this.createScheduleGroup({ day: 'Lundi', startTime: '18:00', endTime: '20:00' }),
    );
  }

  removeSchedule(index: number): void {
    if (this.form.controls.schedules.length <= 1) {
      return;
    }
    this.form.controls.schedules.removeAt(index);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please complete all required fields.', 'Close', { duration: 3000 });
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      name: value.name.trim(),
      subjectId: Number(value.subjectId),
      schoolLevelId: Number(value.schoolLevelId),
      teacherId: Number(value.teacherId),
      room: value.room.trim(),
      maxStudents: Number(value.maxStudents),
      studentIds: this.data?.group?.studentIds ?? [],
      schedules: value.schedules.map((slot) => ({
        day: slot.day,
        startTime: slot.startTime.trim(),
        endTime: slot.endTime.trim(),
      })),
      createdAt: this.data?.group?.createdAt ?? new Date().toISOString().slice(0, 10),
    };

    this.saveLoading.set(true);
    const action =
      this.isEditMode && this.data?.group
        ? this.groupsService.updateGroup(this.data.group.id, payload)
        : this.groupsService.createGroup(payload);

    action.subscribe({
      next: () => {
        this.snackBar.open(
          this.isEditMode ? 'Group updated successfully.' : 'Group created successfully.',
          'Close',
          { duration: 3000 },
        );
        this.dialogRef.close({ saved: true });
      },
      error: () => {
        this.snackBar.open('Unable to save group.', 'Close', { duration: 3000 });
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

  private createScheduleGroup(slot: { day: GroupDay; startTime: string; endTime: string }) {
    return this.fb.nonNullable.group({
      day: [slot.day, Validators.required],
      startTime: [slot.startTime, Validators.required],
      endTime: [slot.endTime, Validators.required],
    });
  }
}
