import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

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
  private readonly router = inject(Router);

  collapsed = signal(false);
  isHandset = signal(false);
  private bpSub?: Subscription;

  readonly navItems: NavItem[] = [
    { label: 'Tableau de bord',   icon: 'dashboard',              route: '/dashboard',         exact: true },
    { label: 'Étudiants',        icon: 'groups',                 route: '/students' },
    { label: 'Professeurs',      icon: 'person',                 route: '/teachers' },
    { label: 'Groupes',          icon: 'view_list',              route: '/groups' },
    { label: 'Finance',          icon: 'bar_chart',              route: '/finance/dashboard' },
    { label: 'Paiements',        icon: 'payments',               route: '/finance/payments' },
    { label: 'Dépenses',         icon: 'account_balance_wallet', route: '/finance/expenses' },
    // { label: 'Présences',        icon: 'event_available',        route: '/attendance' },
    { label: 'Matières',         icon: 'menu_book',              route: '/subjects' },
    { label: 'Niveaux scolaires',icon: 'school',                 route: '/levels' },
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

  isActive(route: string, exact = false): boolean {
    const tree = this.router.parseUrl(this.router.url);
    const path = '/' + (tree.root.children['primary']?.segments.map((s) => s.path).join('/') ?? '');
    return exact ? path === route : path === route || path.startsWith(`${route}/`);
  }

  navigateTo(route: string, drawer: MatSidenav): void {
    void this.router.navigateByUrl(route);
    if (this.isHandset()) {
      void drawer.close();
    }
  }

  ngOnDestroy(): void {
    this.bpSub?.unsubscribe();
  }
}
