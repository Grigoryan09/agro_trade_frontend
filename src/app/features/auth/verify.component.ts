import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppError } from '../../core/models/api.models';
import { AuthShellComponent } from './auth-shell.component';

@Component({
  selector: 'app-verify',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell
      title="Подтверждение e-mail"
      subtitle="Мы отправили 6-значный код на вашу почту. Письма приходят с задержкой — проверьте папку «Спам»."
    >
      <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
        @if (error()) { <div class="alert alert-error">{{ error()!.message }}</div> }
        @if (success()) { <div class="alert alert-success">{{ success() }}</div> }
        @if (info()) { <div class="alert alert-info">{{ info() }}</div> }

        <div class="field">
          <label for="email">E-mail</label>
          <input id="email" type="email" class="input" formControlName="email" />
          @if (invalid('email')) { <span class="field-error">Укажите e-mail</span> }
        </div>
        <div class="field">
          <label for="code">Код подтверждения</label>
          <input
            id="code"
            class="input"
            formControlName="code"
            maxlength="6"
            placeholder="______"
            style="letter-spacing:0.4em;text-align:center;font-size:1.2rem"
          />
          @if (invalid('code')) { <span class="field-error">Введите 6 символов</span> }
        </div>

        <button class="btn btn-primary btn-block" type="submit" [disabled]="loading()">
          {{ loading() ? 'Проверка…' : 'Подтвердить' }}
        </button>
        <button
          class="btn btn-ghost btn-block"
          type="button"
          [disabled]="resending() || !form.controls.email.value"
          (click)="resend()"
        >
          {{ resending() ? 'Отправка…' : 'Отправить код повторно' }}
        </button>
      </form>
      <p class="text-center muted" style="margin-top:16px">
        <a routerLink="/auth/login">Вернуться ко входу</a>
      </p>
    </app-auth-shell>
  `,
})
export class VerifyComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(false);
  resending = signal(false);
  error = signal<AppError | null>(null);
  success = signal<string>('');
  info = signal<string>('');

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const email = q.get('email');
    const code = q.get('code'); // arrives from the verification email link
    if (email) this.form.controls.email.setValue(email);
    if (code) this.form.controls.code.setValue(code);
    if (!email && !code) {
      this.info.set('Письмо отправлено. Введите код из письма, чтобы активировать аккаунт.');
    }
  }

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
    this.auth.verify(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.router.navigate(['/auth/login'], { queryParams: { verified: '1' } });
        } else {
          this.error.set({ status: 400, message: res.message || 'Неверный код' });
        }
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set((err as { appError?: AppError }).appError ?? { status: 0, message: 'Ошибка проверки' });
      },
    });
  }

  resend(): void {
    const email = this.form.controls.email.value;
    if (!email) return;
    this.resending.set(true);
    this.error.set(null);
    this.success.set('');
    this.auth.resendCode({ email }).subscribe({
      next: (res) => {
        this.resending.set(false);
        this.success.set(res.message || 'Код отправлен повторно.');
      },
      error: (err: unknown) => {
        this.resending.set(false);
        this.error.set((err as { appError?: AppError }).appError ?? { status: 0, message: 'Не удалось отправить код' });
      },
    });
  }
}
