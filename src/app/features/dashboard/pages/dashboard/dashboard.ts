import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatTableModule,
    MatListModule,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent {
  loading = signal(true);

  stats = signal([
    { title: 'Total étudiants', value: 1240, icon: 'groups' },
    { title: 'Total professeurs', value: 86, icon: 'person' },
    { title: 'Total groupes', value: 42, icon: 'view_comfy' },
    { title: 'Revenus mensuels', value: 14230, icon: 'account_balance_wallet', prefix: '€' },
    { title: 'Paiements en retard', value: 18, icon: 'warning' },
  ] as Array<any>);

  // recent payments sample
  recentPayments = signal([
    {
      id: 'PMT-001',
      student: 'Alice Dupont',
      amount: 120,
      status: 'Completed',
      date: '2026-05-17',
    },
    { id: 'PMT-002', student: 'Mohamed Ali', amount: 200, status: 'Pending', date: '2026-05-16' },
    { id: 'PMT-003', student: 'Léa Martin', amount: 80, status: 'Late', date: '2026-05-15' },
  ] as Array<any>);

  todaysClasses = signal([
    { time: '08:30', class: 'Math 101', room: 'B12', teacher: 'Mme. Bernard' },
    { time: '10:00', class: 'Physics 2', room: 'C01', teacher: 'M. Laurent' },
    { time: '13:30', class: 'History', room: 'A03', teacher: 'Mme. Rosa' },
  ] as Array<any>);

  constructor() {
    // simulate loading
    setTimeout(() => this.loading.set(false), 700);
  }
}
