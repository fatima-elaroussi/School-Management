import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatBadgeModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class HeaderComponent implements OnDestroy {
  searchQuery = signal('');
  isDark = signal(localStorage.getItem('theme') === 'dark');
  isMobile = signal(false);
  private bpSub?: Subscription;

  notifications = signal([
    { id: 1, title: 'Nouvelle inscription', time: '2h' },
    { id: 2, title: 'Paiement reçu', time: '1d' },
  ] as Array<{ id: number; title: string; time: string }>);

  get unreadCount() {
    return this.notifications().length;
  }

  constructor(private breakpoint: BreakpointObserver) {
    this.bpSub = this.breakpoint.observe([Breakpoints.Handset]).subscribe((r) => {
      this.isMobile.set(!!r.matches);
    });
    this.applyTheme(this.isDark());
  }

  toggleTheme() {
    this.isDark.update((v) => !v);
    this.applyTheme(this.isDark());
  }

  applyTheme(dark: boolean) {
    const body = document.body;
    if (dark) {
      body.classList.add('theme-dark');
      body.classList.remove('theme-light');
      localStorage.setItem('theme', 'dark');
    } else {
      body.classList.add('theme-light');
      body.classList.remove('theme-dark');
      localStorage.setItem('theme', 'light');
    }
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  ngOnDestroy(): void {
    this.bpSub?.unsubscribe();
  }
}
