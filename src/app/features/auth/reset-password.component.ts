import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppError } from '../../core/models/api.models';
import { AuthShellComponent } from './auth-shell.component';

/**
 * NOTE (contract gap): the backend exposes NO password-reset endpoint.
 * The only related public call is POST /auth/resend-code (sends a code email).
 * Until a real reset endpoint exists, this screen requests a code and explains
 * that the password can only be changed after login (PUT /user/change-password).
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell
      title="Восстановление доступа"
      subtitle="Укажите e-mail — мы отправим код подтверждения."
    >
      <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
        @if (error()) { <div class="alert alert-error">{{ error()!.message }}</div> }
        @if (success()) { <div class="alert alert-success">{{ success() }}</div> }

        <div class="alert alert-info">
          Сброс пароля без входа пока не поддерживается сервером. Сменить пароль можно после входа в
          разделе «Профиль».
        </div>

        <div class="field">
          <label for="email">E-mail</label>
          <input id="email" type="email" class="input" formControlName="email" />
          @if (invalid('email')) { <span class="field-error">Некорректный e-mail</span> }
        </div>

        <button class="btn btn-primary btn-block" type="submit" [disabled]="loading()">
          {{ loading() ? 'Отправка…' : 'Отправить код' }}
        </button>
      </form>
      <p class="text-center muted" style="margin-top:16px">
        <a routerLink="/auth/login">Вернуться ко входу</a>
      </p>
    </app-auth-shell>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  error = signal<AppError | null>(null);
  success = signal<string>('');

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    // Email links may carry a code; we read it for parity even though the
    // backend has no endpoint to consume it for a password change yet.
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) this.form.controls.email.setValue(email);
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
    this.success.set('');
    this.auth.resendCode(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.success.set(res.message || 'Код отправлен на указанный e-mail.');
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(
          (err as { appError?: AppError }).appError ?? { status: 0, message: 'Не удалось отправить код' },
        );
      },
    });
  }
}
