import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppError } from '../../core/models/api.models';
import { AuthShellComponent } from './auth-shell.component';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell title="Вход" subtitle="Войдите в аккаунт Agro Trade">
      <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
        @if (error()) {
          <div class="alert alert-error">{{ error()!.message }}</div>
        }
        <div class="field">
          <label for="username">Логин</label>
          <input id="username" class="input" formControlName="username" autocomplete="username" />
          @if (invalid('username')) {
            <span class="field-error">Введите логин</span>
          }
        </div>
        <div class="field">
          <label for="password">Пароль</label>
          <input
            id="password"
            type="password"
            class="input"
            formControlName="password"
            autocomplete="current-password"
          />
          @if (invalid('password')) {
            <span class="field-error">Введите пароль</span>
          }
        </div>
        <button class="btn btn-primary btn-block" type="submit" [disabled]="loading()">
          {{ loading() ? 'Вход…' : 'Войти' }}
        </button>
      </form>
      <p class="text-center muted" style="margin-top:16px">
        Нет аккаунта? <a routerLink="/auth/register">Регистрация</a>
      </p>
      <p class="text-center muted">
        <a routerLink="/auth/reset-password">Забыли пароль?</a>
      </p>
    </app-auth-shell>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<AppError | null>(null);

  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        const returnUrl = new URLSearchParams(location.search).get('returnUrl') || '/offers';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set((err as { appError?: AppError }).appError ?? { status: 0, message: 'Ошибка входа' });
      },
    });
  }
}
