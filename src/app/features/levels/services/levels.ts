import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { SchoolLevel } from '../level.model';

@Injectable({
  providedIn: 'root',
})
export class LevelsService {
  private readonly httpClient = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/levels';

  /**
   * Retrieve all school levels
   */
  getLevels(): Observable<SchoolLevel[]> {
    return this.httpClient.get<SchoolLevel[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Error fetching levels:', error);
        return throwError(() => new Error('Failed to fetch levels'));
      }),
    );
  }

  /**
   * Retrieve a single school level by ID
   */
  getLevelById(id: number): Observable<SchoolLevel> {
    return this.httpClient.get<SchoolLevel>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error(`Error fetching level with ID ${id}:`, error);
        return throwError(() => new Error(`Failed to fetch level with ID ${id}`));
      }),
    );
  }

  /**
   * Create a new school level
   */
  createLevel(level: Omit<SchoolLevel, 'id'>): Observable<SchoolLevel> {
    return this.httpClient.post<SchoolLevel>(this.apiUrl, level).pipe(
      tap((newLevel) => console.log('Level created successfully:', newLevel)),
      catchError((error) => {
        console.error('Error creating level:', error);
        return throwError(() => new Error('Failed to create level'));
      }),
    );
  }

  /**
   * Update an existing school level
   */
  updateLevel(id: number, level: Partial<SchoolLevel>): Observable<SchoolLevel> {
    return this.httpClient.put<SchoolLevel>(`${this.apiUrl}/${id}`, level).pipe(
      tap((updatedLevel) => console.log('Level updated successfully:', updatedLevel)),
      catchError((error) => {
        console.error(`Error updating level with ID ${id}:`, error);
        return throwError(() => new Error(`Failed to update level with ID ${id}`));
      }),
    );
  }

  /**
   * Delete a school level by ID
   */
  deleteLevel(id: number): Observable<void> {
    return this.httpClient.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => console.log(`Level with ID ${id} deleted successfully`)),
      catchError((error) => {
        console.error(`Error deleting level with ID ${id}:`, error);
        return throwError(() => new Error(`Failed to delete level with ID ${id}`));
      }),
    );
  }
}
