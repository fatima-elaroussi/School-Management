import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api.config';
import {
  CreateGroupPayload,
  Group,
  UpdateGroupPayload,
} from '../models/group.model';

@Injectable({
  providedIn: 'root',
})
export class GroupsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = API_ENDPOINTS.groups;

  getGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(this.baseUrl).pipe(
      catchError((error) => this.handleError('fetch groups', error)),
    );
  }

  getGroupById(id: number): Observable<Group> {
    return this.http.get<Group>(`${this.baseUrl}/${id}`).pipe(
      catchError((error) => this.handleError(`fetch group ${id}`, error)),
    );
  }

  createGroup(payload: CreateGroupPayload): Observable<Group> {
    return this.http.post<Group>(this.baseUrl, payload).pipe(
      catchError((error) => this.handleError('create group', error)),
    );
  }

  updateGroup(id: number, payload: UpdateGroupPayload): Observable<Group> {
    return this.http.put<Group>(`${this.baseUrl}/${id}`, payload).pipe(
      catchError((error) => this.handleError(`update group ${id}`, error)),
    );
  }

  deleteGroup(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      catchError((error) => this.handleError(`delete group ${id}`, error)),
    );
  }

  private handleError(action: string, error: unknown): Observable<never> {
    console.error(`GroupsService: failed to ${action}`, error);
    return throwError(() => new Error(`Failed to ${action}`));
  }
}
