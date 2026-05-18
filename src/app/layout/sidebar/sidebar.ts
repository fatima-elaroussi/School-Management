import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss'],
})
export class SidebarComponent implements OnDestroy {
  collapsed = signal(false);
  isHandset = signal(false);
  private bpSub?: Subscription;

  navItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Étudiants', icon: 'groups', route: '/students' },
    { label: 'Professeurs', icon: 'person', route: '/teachers' },
    { label: 'Groupes', icon: 'view_list', route: '/groups' },
    { label: 'Paiements', icon: 'payment', route: '/payments' },
    { label: 'Finance', icon: 'account_balance_wallet', route: '/finance' },
    { label: 'Présences', icon: 'event_available', route: '/attendance' },
    { label: 'Matières', icon: 'menu_book', route: '/subjects' },
    { label: 'Niveaux scolaires', icon: 'school', route: '/levels' },
  ];

  constructor(private breakpointObserver: BreakpointObserver) {
    this.bpSub = this.breakpointObserver.observe([Breakpoints.Handset]).subscribe((r) => {
      this.isHandset.set(!!r.matches);
      if (r.matches) this.collapsed.set(false);
    });
  }

  toggleCollapsed() {
    this.collapsed.update((v) => !v);
  }

  ngOnDestroy(): void {
    this.bpSub?.unsubscribe();
  }
}
