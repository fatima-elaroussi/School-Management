import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_ENDPOINTS } from '../../../core/config/api.config';
import { Group } from '../models/group.model';
import { GroupsService } from './groups';

describe('GroupsService', () => {
  let service: GroupsService;
  let httpMock: HttpTestingController;

  const mockGroup: Group = {
    id: 1,
    name: 'Math Bac',
    subjectId: 1,
    schoolLevelId: 2,
    teacherId: 1,
    room: 'B12',
    maxStudents: 25,
    studentIds: [1, 2],
    schedules: [{ day: 'Lundi', startTime: '08:30', endTime: '10:00' }],
    createdAt: '2026-05-01',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GroupsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getGroups should GET /groups', () => {
    service.getGroups().subscribe((groups) => {
      expect(groups).toEqual([mockGroup]);
    });

    const req = httpMock.expectOne(API_ENDPOINTS.groups);
    expect(req.request.method).toBe('GET');
    req.flush([mockGroup]);
  });

  it('getGroupById should GET /groups/:id', () => {
    service.getGroupById(1).subscribe((group) => {
      expect(group).toEqual(mockGroup);
    });

    const req = httpMock.expectOne(`${API_ENDPOINTS.groups}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockGroup);
  });

  it('createGroup should POST /groups', () => {
    const { id: _id, ...createPayload } = mockGroup;

    service.createGroup(createPayload).subscribe((group) => {
      expect(group).toEqual(mockGroup);
    });

    const req = httpMock.expectOne(API_ENDPOINTS.groups);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(createPayload);
    req.flush(mockGroup);
  });

  it('updateGroup should PUT /groups/:id', () => {
    service.updateGroup(1, { name: 'Updated' }).subscribe((group) => {
      expect(group.name).toBe('Updated');
    });

    const req = httpMock.expectOne(`${API_ENDPOINTS.groups}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockGroup, name: 'Updated' });
  });

  it('deleteGroup should DELETE /groups/:id', () => {
    service.deleteGroup(1).subscribe();

    const req = httpMock.expectOne(`${API_ENDPOINTS.groups}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
