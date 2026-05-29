import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
  ExpenseDialogResult,
  ExpenseFormDialog,
} from '../../components/expense-form-dialog/expense-form-dialog';
import { Expense } from '../../models/expense.model';

@Component({
  selector: 'app-expenses-list',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './expenses-list.html',
  styleUrls: ['./expenses-list.scss'],
})
export class ExpensesList {
  private readonly dialog = inject(MatDialog);

  openExpenseDialog(expense?: Expense): void {
    const ref = this.dialog.open<ExpenseFormDialog, { expense?: Expense }, ExpenseDialogResult>(
      ExpenseFormDialog,
      {
        width: '660px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        autoFocus: 'first-tabbable',
        data: { expense },
      },
    );

    ref.afterClosed().subscribe((result) => {
      if (result?.saved) {
        // TODO: reload expenses list
      }
    });
  }
}
