import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AuthUser {
  id: number;
  email: string;
  password?: string;
  fullName?: string;
  name?: string;
  role: 'admin' | 'assistante' | string;
  token?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly storageKey = 'schoolman:auth';
  private readonly usersEndpoint = 'http://localhost:3000/users';

  currentUser = signal<AuthUser | null>(null);
  isAuthenticated = computed(() => !!this.currentUser());
  token = computed(() => this.currentUser()?.token ?? null);

  constructor(private http: HttpClient) {
    this.restoreSession();
  }

  private persist(user: AuthUser | null, remember = true) {
    if (user) {
      if (remember) {
        localStorage.setItem(this.storageKey, JSON.stringify(user));
      } else {
        localStorage.removeItem(this.storageKey);
      }
      this.currentUser.set(user);
    } else {
      localStorage.removeItem(this.storageKey);
      this.currentUser.set(null);
    }
  }

  private restoreSession() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AuthUser;
      this.currentUser.set(parsed);
    } catch {
      this.currentUser.set(null);
    }
  }

  async login(email: string, password: string, role?: string, remember = true): Promise<AuthUser> {
    const url = `${this.usersEndpoint}?email=${encodeURIComponent(email)}`;
    const users = await firstValueFrom(this.http.get<AuthUser[]>(url));
    const match = users.find((u) => u.password === password && (role ? u.role === role : true));
    if (!match) throw new Error('Invalid credentials');

    const token = this.generateToken(match);
    const authUser: AuthUser = { ...match, token };
    this.persist(authUser, remember);
    return authUser;
  }

  logout() {
    this.persist(null);
  }

  hasRole(role: string) {
    return this.currentUser() ? this.currentUser()!.role === role : false;
  }

  setRole(role: string) {
    const cur = this.currentUser();
    if (!cur) return;
    const updated = { ...cur, role };
    this.persist(updated);
  }

  private generateToken(user: AuthUser) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
      }),
    );
    const signature = Math.random().toString(36).slice(2);
    return `${header}.${payload}.${signature}`;
  }
}
