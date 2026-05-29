import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { AuthService } from '../../../../core/services/auth';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,

    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginComponent {
  // Modern Angular inject()
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  // Signals
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // prefersDark = signal(
  //   typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  // );

  // Reactive Form
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['admin', [Validators.required]],
    remember: [false],
  });

  // Roles
  roles = [
    { value: 'admin', label: 'Admin' },
    { value: 'assistante', label: 'Assistante' },
  ];

  // Submit
  private get returnUrl(): string {
    return this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    const email = this.email?.value ?? '';
    const password = this.password?.value ?? '';
    const role = this.role?.value ?? 'admin';
    const remember = !!this.form.get('remember')?.value;

    try {
      await this.authService.login(email, password, role, remember);
      await this.router.navigateByUrl(this.returnUrl);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Identifiants incorrects. Veuillez réessayer.';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Theme toggle
  // toggleTheme() {
  //   const next = !this.prefersDark();

  //   this.prefersDark.set(next);

  //   document.documentElement.classList.toggle('dark-mode', next);
  // }

  // Getters
  get email() {
    return this.form.get('email');
  }

  get password() {
    return this.form.get('password');
  }

  get role() {
    return this.form.get('role');
  }
}
