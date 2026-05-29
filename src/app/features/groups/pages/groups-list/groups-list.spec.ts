import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { GroupsList } from './groups-list';

describe('GroupsList', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupsList],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(GroupsList);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
