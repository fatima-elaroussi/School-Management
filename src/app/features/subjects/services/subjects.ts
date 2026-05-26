import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Subject } from '../subject.model';

@Injectable({
  providedIn: 'root',
})
export class SubjectsService {
  private readonly httpClient = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/subjects';

  /**
   * Retrieve all subjects
   */
  getSubjects(): Observable<Subject[]> {
    return this.httpClient.get<Subject[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Error fetching subjects:', error);
        return throwError(() => new Error('Failed to fetch subjects'));
      }),
    );
  }

  /**
   * Retrieve a single subject by ID
   */
  getSubjectById(id: number): Observable<Subject> {
    return this.httpClient.get<Subject>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error(`Error fetching subject with ID ${id}:`, error);
        return throwError(() => new Error(`Failed to fetch subject with ID ${id}`));
      }),
    );
  }

  /**
   * Retrieve subjects by school level ID
   */
  getSubjectsByLevel(levelId: number): Observable<Subject[]> {
    return this.httpClient.get<Subject[]>(`${this.apiUrl}?schoolLevels_like=${levelId}`).pipe(
      catchError((error) => {
        console.error(`Error fetching subjects for level ${levelId}:`, error);
        return throwError(() => new Error(`Failed to fetch subjects for level ${levelId}`));
      }),
    );
  }

  /**
   * Create a new subject
   */
  createSubject(subject: Omit<Subject, 'id'>): Observable<Subject> {
    return this.httpClient.post<Subject>(this.apiUrl, subject).pipe(
      tap((newSubject) => console.log('Subject created successfully:', newSubject)),
      catchError((error) => {
        console.error('Error creating subject:', error);
        return throwError(() => new Error('Failed to create subject'));
      }),
    );
  }

  /**
   * Update an existing subject
   */
  updateSubject(id: number, subject: Partial<Subject>): Observable<Subject> {
    return this.httpClient.put<Subject>(`${this.apiUrl}/${id}`, subject).pipe(
      tap((updatedSubject) => console.log('Subject updated successfully:', updatedSubject)),
      catchError((error) => {
        console.error(`Error updating subject with ID ${id}:`, error);
        return throwError(() => new Error(`Failed to update subject with ID ${id}`));
      }),
    );
  }

  /**
   * Delete a subject by ID
   */
  deleteSubject(id: number): Observable<void> {
    return this.httpClient.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => console.log(`Subject with ID ${id} deleted successfully`)),
      catchError((error) => {
        console.error(`Error deleting subject with ID ${id}:`, error);
        return throwError(() => new Error(`Failed to delete subject with ID ${id}`));
      }),
    );
  }
}
