import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';
import { API_ENDPOINTS } from '../config/api.config';
import { createInitialLookupState, LookupState } from '../models/lookup-state.model';
import { SchoolLevel } from '../../features/levels/level.model';
import { Subject } from '../../features/subjects/subject.model';

export type LookupResource = 'levels' | 'subjects';

export interface LookupOption<TId = number> {
  value: TId;
  label: string;
}

@Injectable({
  providedIn: 'root',
})
export class LookupsService {
  private readonly http = inject(HttpClient);

  private readonly levelsState = signal<LookupState<SchoolLevel>>(
    createInitialLookupState<SchoolLevel>(),
  );
  private readonly subjectsState = signal<LookupState<Subject>>(createInitialLookupState<Subject>());

  private levelsCache$: Observable<SchoolLevel[]> | null = null;
  private subjectsCache$: Observable<Subject[]> | null = null;

  // —— Read-only signal API ——————————————————————————————————————————

  readonly levelsState$ = this.levelsState.asReadonly();
  readonly subjectsState$ = this.subjectsState.asReadonly();

  readonly levels = computed(() => this.levelsState().data);
  readonly subjects = computed(() => this.subjectsState().data);

  readonly levelsLoading = computed(() => this.levelsState().loading);
  readonly subjectsLoading = computed(() => this.subjectsState().loading);

  readonly levelsLoaded = computed(() => this.levelsState().loaded);
  readonly subjectsLoaded = computed(() => this.subjectsState().loaded);

  readonly levelsError = computed(() => this.levelsState().error);
  readonly subjectsError = computed(() => this.subjectsState().error);

  readonly anyLoading = computed(() => this.levelsLoading() || this.subjectsLoading());

  readonly levelNameById = computed(() => this.buildNameMap(this.levels()));
  readonly subjectNameById = computed(() => this.buildNameMap(this.subjects()));

  readonly levelOptions = computed<LookupOption[]>(() =>
    this.levels().map((level) => ({ value: level.id, label: level.name })),
  );

  readonly subjectOptions = computed<LookupOption[]>(() =>
    this.subjects().map((subject) => ({ value: subject.id, label: subject.name })),
  );

  /** Sorted level names for string-based forms (students, teachers). */
  readonly levelNames = computed(() => this.sortNames(this.levels().map((level) => level.name)));

  /** Sorted subject names for string-based forms (students, teachers). */
  readonly subjectNames = computed(() =>
    this.sortNames(this.subjects().map((subject) => subject.name)),
  );

  readonly levelsByCategory = computed(() => {
    const grouped = new Map<SchoolLevel['category'], SchoolLevel[]>();
    for (const level of this.levels()) {
      const list = grouped.get(level.category) ?? [];
      list.push(level);
      grouped.set(level.category, list);
    }
    return grouped;
  });

  // —— RxJS loaders (cached) —————————————————————————————————————————

  loadLevels(forceRefresh = false): Observable<SchoolLevel[]> {
    if (forceRefresh) {
      this.invalidateLevels();
    }

    if (!forceRefresh && this.levelsState().loaded && !this.levelsState().error) {
      return of(this.levels());
    }

    if (!this.levelsCache$) {
      this.patchLevelsState({ loading: true, error: null });

      this.levelsCache$ = this.http.get<SchoolLevel[]>(API_ENDPOINTS.levels).pipe(
        map((items) => items ?? []),
        tap((items) => {
          this.patchLevelsState({
            data: items,
            loaded: true,
            loading: false,
            error: null,
            lastFetchedAt: Date.now(),
          });
        }),
        catchError((err) => {
          const message = this.toErrorMessage(err, 'Failed to load school levels');
          this.patchLevelsState({
            loading: false,
            loaded: false,
            error: message,
          });
          this.levelsCache$ = null;
          return throwError(() => new Error(message));
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }

    return this.levelsCache$;
  }

  loadSubjects(forceRefresh = false): Observable<Subject[]> {
    if (forceRefresh) {
      this.invalidateSubjects();
    }

    if (!forceRefresh && this.subjectsState().loaded && !this.subjectsState().error) {
      return of(this.subjects());
    }

    if (!this.subjectsCache$) {
      this.patchSubjectsState({ loading: true, error: null });

      this.subjectsCache$ = this.http.get<Subject[]>(API_ENDPOINTS.subjects).pipe(
        map((items) => items ?? []),
        tap((items) => {
          this.patchSubjectsState({
            data: items,
            loaded: true,
            loading: false,
            error: null,
            lastFetchedAt: Date.now(),
          });
        }),
        catchError((err) => {
          const message = this.toErrorMessage(err, 'Failed to load subjects');
          this.patchSubjectsState({
            loading: false,
            loaded: false,
            error: message,
          });
          this.subjectsCache$ = null;
          return throwError(() => new Error(message));
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }

    return this.subjectsCache$;
  }

  /** Loads levels and subjects in parallel; reuses cache when already warm. */
  preloadAll(forceRefresh = false): Observable<{ levels: SchoolLevel[]; subjects: Subject[] }> {
    return forkJoin({
      levels: this.loadLevels(forceRefresh),
      subjects: this.loadSubjects(forceRefresh),
    });
  }

  /**
   * Ensures levels are available in the signal store.
   * Safe to call from component constructors / ngOnInit.
   */
  ensureLevels(): Observable<SchoolLevel[]> {
    return this.loadLevels();
  }

  ensureSubjects(): Observable<Subject[]> {
    return this.loadSubjects();
  }

  // —— Query helpers ———————————————————————————————————————————————

  getLevelName(id: number): string {
    return this.levelNameById()[id] ?? `Level ${id}`;
  }

  getSubjectName(id: number): string {
    return this.subjectNameById()[id] ?? `Subject ${id}`;
  }

  getLevelById(id: number): SchoolLevel | undefined {
    return this.levels().find((level) => level.id === id);
  }

  getSubjectById(id: number): Subject | undefined {
    return this.subjects().find((subject) => subject.id === id);
  }

  getSubjectsForLevel(levelId: number): Subject[] {
    return this.subjects().filter((subject) => subject.schoolLevels.includes(levelId));
  }

  getSubjectsForLevel$(levelId: number): Observable<Subject[]> {
    return this.loadSubjects().pipe(
      map(() => this.getSubjectsForLevel(levelId)),
    );
  }

  /**
   * Merges catalog names with legacy values still stored on entities
   * (e.g. free-text before lookups were introduced).
   */
  withLegacyNames(catalog: string[], legacy: string | string[] | undefined | null): string[] {
    const merged = new Set(catalog);
    const legacyItems = Array.isArray(legacy) ? legacy : legacy ? [legacy] : [];
    for (const name of legacyItems) {
      const trimmed = name?.trim();
      if (trimmed) {
        merged.add(trimmed);
      }
    }
    return this.sortNames([...merged]);
  }

  // —— Cache invalidation (call after CRUD) ——————————————————————————

  invalidateLevels(): void {
    this.levelsCache$ = null;
    this.levelsState.set(createInitialLookupState<SchoolLevel>());
  }

  invalidateSubjects(): void {
    this.subjectsCache$ = null;
    this.subjectsState.set(createInitialLookupState<Subject>());
  }

  invalidate(resource: LookupResource): void {
    if (resource === 'levels') {
      this.invalidateLevels();
      return;
    }
    this.invalidateSubjects();
  }

  invalidateAll(): void {
    this.invalidateLevels();
    this.invalidateSubjects();
  }

  /** Clears cache and reloads a single resource. */
  refreshLevels(): Observable<SchoolLevel[]> {
    return this.loadLevels(true);
  }

  refreshSubjects(): Observable<Subject[]> {
    return this.loadSubjects(true);
  }

  refreshAll(): Observable<{ levels: SchoolLevel[]; subjects: Subject[] }> {
    return this.preloadAll(true);
  }

  // —— Private ————————————————————————————————————————————————————————

  private patchLevelsState(patch: Partial<LookupState<SchoolLevel>>): void {
    this.levelsState.update((state) => ({ ...state, ...patch }));
  }

  private patchSubjectsState(patch: Partial<LookupState<Subject>>): void {
    this.subjectsState.update((state) => ({ ...state, ...patch }));
  }

  private buildNameMap<T extends { id: number; name: string }>(items: T[]): Record<number, string> {
    return Object.fromEntries(items.map((item) => [item.id, item.name]));
  }

  private sortNames(names: string[]): string[] {
    return [...names].sort((a, b) => a.localeCompare(b, 'fr'));
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return fallback;
  }
}
