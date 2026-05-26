import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LevelsList } from './levels-list';

describe('LevelsList', () => {
  let component: LevelsList;
  let fixture: ComponentFixture<LevelsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LevelsList],
    }).compileComponents();

    fixture = TestBed.createComponent(LevelsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
