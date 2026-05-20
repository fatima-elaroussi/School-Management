import { TestBed } from '@angular/core/testing';

import { Teachers } from './teachers';

describe('Teachers', () => {
  let service: Teachers;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Teachers);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
