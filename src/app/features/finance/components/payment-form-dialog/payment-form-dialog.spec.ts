import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentFormDialog } from './payment-form-dialog';

describe('PaymentFormDialog', () => {
  let component: PaymentFormDialog;
  let fixture: ComponentFixture<PaymentFormDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentFormDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentFormDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
