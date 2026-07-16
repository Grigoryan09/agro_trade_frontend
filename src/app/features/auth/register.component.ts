import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppError } from '../../core/models/api.models';
import { GENDERS } from '../../core/models/enums';
import { RegisterRequest } from '../../core/models/auth.models';
import { AuthShellComponent } from './auth-shell.component';

@Component({
  selector: 'app-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell title="Регистрация" subtitle="Создайте аккаунт Agro Trade">
      <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
        @if (error()) {
          <div class="alert alert-error">{{ error()!.message }}</div>
        }
        <div class="row" style="gap:12px">
          <div class="field" style="flex:1">
            <label for="name">Имя</label>
            <input id="name" class="input" formControlName="name" />
            @if (invalid('name')) { <span class="field-error">2–50 символов</span> }
          </div>
          <div class="field" style="flex:1">
            <label for="surname">Фамилия</label>
            <input id="surname" class="input" formControlName="surname" />
            @if (invalid('surname')) { <span class="field-error">2–50 символов</span> }
          </div>
        </div>

        <div class="row" style="gap:12px">
          <div class="field" style="flex:1">
            <label for="gender">Пол</label>
            <select id="gender" class="select" formControlName="gender">
              @for (g of genders; track g.value) {
                <option [value]="g.value">{{ g.label }}</option>
              }
            </select>
          </div>
          <div class="field" style="flex:1">
            <label for="birthDate">Дата рождения</label>
            <input id="birthDate" type="date" class="input" formControlName="birthDate" />
            @if (invalid('birthDate')) { <span class="field-error">Укажите дату</span> }
          </div>
        </div>

        <div class="field">
          <label for="address">Адрес</label>
          <input id="address" class="input" formControlName="address" />
          @if (invalid('address')) { <span class="field-error">До 255 символов</span> }
        </div>

        <div class="field">
          <label for="email">E-mail</label>
          <input id="email" type="email" class="input" formControlName="email" autocomplete="email" />
          @if (invalid('email')) { <span class="field-error">Некорректный e-mail</span> }
        </div>

        <div class="field">
          <label for="phoneNumber">Телефон</label>
          <input id="phoneNumber" class="input" formControlName="phoneNumber" placeholder="+374..." />
          @if (invalid('phoneNumber')) { <span class="field-error">10–20 символов</span> }
        </div>

        <div class="field">
          <label for="username">Логин</label>
          <input id="username" class="input" formControlName="username" autocomplete="username" />
          @if (invalid('username')) { <span class="field-error">3–30 символов</span> }
        </div>

        <div class="field">
          <label for="password">Пароль</label>
          <input id="password" type="password" class="input" formControlName="password" autocomplete="new-password" />
          @if (invalid('password')) { <span class="field-error">Минимум 6 символов</span> }
        </div>

        <div class="stack" style="gap:8px">
          <label class="row" style="gap:8px;font-weight:500">
            <input type="checkbox" formControlName="emailEnabled" /> E-mail уведомления
          </label>
          <label class="row" style="gap:8px;font-weight:500">
            <input type="checkbox" formControlName="smsEnabled" /> SMS уведомления
          </label>
          <label class="row" style="gap:8px;font-weight:500">
            <input type="checkbox" formControlName="inAppEnabled" /> Уведомления в приложении
          </label>
        </div>

        <button class="btn btn-primary btn-block" type="submit" [disabled]="loading()">
          {{ loading() ? 'Отправка…' : 'Зарегистрироваться' }}
        </button>
      </form>
      <p class="text-center muted" style="margin-top:16px">
        Уже есть аккаунт? <a routerLink="/auth/login">Войти</a>
      </p>
    </app-auth-shell>
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  genders = GENDERS;
  loading = signal(false);
  error = signal<AppError | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    surname: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    gender: ['MALE' as const, Validators.required],
    birthDate: ['', Validators.required],
    address: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(20)]],
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    emailEnabled: [true],
    smsEnabled: [false],
    inAppEnabled: [true],
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
    const body = this.form.getRawValue() as RegisterRequest;
    this.auth.register(body).subscribe({
      next: () => {
        this.loading.set(false);
        // Email is async — route to verify and tell the user to check their inbox.
        this.router.navigate(['/auth/verify'], { queryParams: { email: body.email } });
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(
          (err as { appError?: AppError }).appError ?? { status: 0, message: 'Ошибка регистрации' },
        );
      },
    });
  }
}
