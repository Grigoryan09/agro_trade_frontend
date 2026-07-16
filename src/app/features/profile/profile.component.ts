import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { BaseUserInfo, OrganizationDetails, PassportInfo } from '../../core/models/user.models';
import { AppError } from '../../core/models/api.models';
import { appErrorOf } from '../../core/util/format';
import { DrawerComponent } from '../../shared/drawer.component';

type Tab = 'profile' | 'security' | 'passport' | 'organizations';

const PHONE = /^\+?[0-9]{10,15}$/;
const LICENSE = /^[A-Z0-9-]{5,20}$/;
const PASSPORT_NO = /^[A-Z0-9]{6,15}$/;

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DrawerComponent],
  template: `
    <div class="container">
      <h1>Профиль</h1>
      <div class="tabs">
        <button class="tab" [class.active]="tab() === 'profile'" (click)="tab.set('profile')">Данные</button>
        <button class="tab" [class.active]="tab() === 'security'" (click)="tab.set('security')">Пароль</button>
        <button class="tab" [class.active]="tab() === 'passport'" (click)="tab.set('passport')">Паспорт</button>
        <button class="tab" [class.active]="tab() === 'organizations'" (click)="tab.set('organizations')">
          Организации
        </button>
      </div>

      @if (banner(); as b) {
        <div class="alert alert-success" style="margin-bottom:16px">{{ b }}</div>
      }

      <!-- PROFILE -->
      @if (tab() === 'profile') {
        @if (loadingProfile()) {
          <div class="card"><div class="skeleton" style="height:240px"></div></div>
        } @else {
          <form class="card stack" [formGroup]="profileForm" (ngSubmit)="saveProfile()">
            @if (profileError()) { <div class="alert alert-error">{{ profileError()!.message }}</div> }
            <div class="grid2">
              <div class="field">
                <label>Имя</label>
                <input class="input" formControlName="name" />
              </div>
              <div class="field">
                <label>Фамилия</label>
                <input class="input" formControlName="surname" />
              </div>
              <div class="field">
                <label>Дата рождения</label>
                <input type="date" class="input" formControlName="birthDate" />
              </div>
              <div class="field">
                <label>Телефон</label>
                <input class="input" formControlName="phoneNumber" />
                @if (pInvalid('phoneNumber')) { <span class="field-error">Формат: +71234567890</span> }
              </div>
              <div class="field" style="grid-column:1/-1">
                <label>Адрес</label>
                <input class="input" formControlName="address" />
              </div>
            </div>
            <div class="muted">Логин: {{ profile()?.username }} · Email: {{ profile()?.email }}</div>
            <button class="btn btn-primary" type="submit" [disabled]="savingProfile()">
              {{ savingProfile() ? 'Сохраняем…' : 'Сохранить' }}
            </button>
          </form>
        }
      }

      <!-- SECURITY -->
      @if (tab() === 'security') {
        <form class="card stack" [formGroup]="passwordForm" (ngSubmit)="savePassword()">
          @if (passwordError()) { <div class="alert alert-error">{{ passwordError()!.message }}</div> }
          <div class="field">
            <label>Текущий пароль</label>
            <input type="password" class="input" formControlName="oldPassword" />
          </div>
          <div class="field">
            <label>Новый пароль</label>
            <input type="password" class="input" formControlName="newPassword" />
            @if (pwInvalid('newPassword')) { <span class="field-error">8–64 символа</span> }
          </div>
          <button class="btn btn-primary" type="submit" [disabled]="savingPassword()">
            {{ savingPassword() ? 'Сохраняем…' : 'Сменить пароль' }}
          </button>
        </form>
      }

      <!-- PASSPORT -->
      @if (tab() === 'passport') {
        @if (loadingPassport()) {
          <div class="card"><div class="skeleton" style="height:120px"></div></div>
        } @else {
          @if (passport(); as p) {
            <div class="card stack">
              <div><span class="muted">Номер:</span> {{ p.passportNumber }}</div>
              <!-- issuedBy/issueDate/expiryDate are NOT returned by GET today (see CONTRACT-GAPS); fall back to —. -->
              <div><span class="muted">Выдан:</span> {{ p.issuedBy || '—' }} ({{ p.issueDate || '—' }})</div>
              <div><span class="muted">Действителен до:</span> {{ p.expiryDate || '—' }}</div>
              <div class="row" style="gap:8px">
                <button class="btn btn-secondary btn-sm" (click)="editPassport(p)">Изменить</button>
                <button class="btn btn-danger btn-sm" (click)="deletePassport()">Удалить</button>
              </div>
            </div>
          } @else {
            <div class="state">
              <div class="state-icon">🪪</div>
              <p>Паспорт не добавлен</p>
              <button class="btn btn-primary" (click)="editPassport(null)">Добавить паспорт</button>
            </div>
          }
        }
      }

      <!-- ORGANIZATIONS -->
      @if (tab() === 'organizations') {
        <div class="row" style="margin-bottom:12px">
          <span class="spacer"></span>
          <button class="btn btn-primary btn-sm" (click)="editOrg(null)">+ Организация</button>
        </div>
        @if (loadingOrgs()) {
          <div class="card"><div class="skeleton" style="height:80px"></div></div>
        } @else if (orgs().length === 0) {
          <div class="state"><div class="state-icon">🏢</div><p>Организаций нет</p></div>
        } @else {
          <div class="list">
            @for (o of orgs(); track o.organizationId ?? o.id) {
              <div class="card org-card">
                <div>
                  <strong>{{ o.name }}</strong>
                  <div class="muted">Лицензия {{ o.licenseNumber }} · {{ o.email }}</div>
                  <div class="muted">{{ o.address }} · {{ o.contactNumber }}</div>
                </div>
                <!-- Edit/delete need an id the organization response DTO doesn't return yet (CONTRACT-GAPS #13). -->
                <div class="row" style="gap:8px" [title]="(o.organizationId ?? o.id) ? '' : 'Недоступно: сервер не возвращает id организации (CONTRACT-GAPS #13)'">
                  <button class="btn btn-secondary btn-sm" [disabled]="!(o.organizationId ?? o.id)" (click)="editOrg(o)">Изменить</button>
                  <button class="btn btn-danger btn-sm" [disabled]="!(o.organizationId ?? o.id)" (click)="deleteOrg(o)">Удалить</button>
                </div>
              </div>
            }
          </div>
        }
      }
    </div>

    <!-- Passport drawer -->
    <app-drawer [open]="passportOpen()" [title]="'Паспортные данные'" (close)="passportOpen.set(false)">
      <form class="stack" [formGroup]="passportForm" (ngSubmit)="savePassport()">
        @if (passportFormError()) { <div class="alert alert-error">{{ passportFormError()!.message }}</div> }
        <div class="field">
          <label>Номер паспорта</label>
          <input class="input" formControlName="passportNumber" />
          @if (psInvalid('passportNumber')) { <span class="field-error">6–15 символов A-Z0-9</span> }
        </div>
        <div class="field">
          <label>Дата выдачи</label>
          <input type="date" class="input" formControlName="issueDate" />
        </div>
        <div class="field">
          <label>Действителен до</label>
          <input type="date" class="input" formControlName="expiryDate" />
        </div>
        <div class="field">
          <label>Кем выдан</label>
          <input class="input" formControlName="issuedBy" />
        </div>
        <button class="btn btn-primary btn-block" type="submit" [disabled]="savingPassportForm()">
          Сохранить
        </button>
      </form>
    </app-drawer>

    <!-- Organization drawer -->
    <app-drawer [open]="orgOpen()" [title]="editingOrg() ? 'Изменить организацию' : 'Новая организация'" (close)="orgOpen.set(false)">
      <form class="stack" [formGroup]="orgForm" (ngSubmit)="saveOrg()">
        @if (orgFormError()) { <div class="alert alert-error">{{ orgFormError()!.message }}</div> }
        <div class="field">
          <label>Название</label>
          <input class="input" formControlName="name" />
          @if (oInvalid('name')) { <span class="field-error">2–100 символов</span> }
        </div>
        <div class="field">
          <label>Лицензия</label>
          <input class="input" formControlName="licenseNumber" />
          @if (oInvalid('licenseNumber')) { <span class="field-error">5–20 символов A-Z0-9-</span> }
        </div>
        <div class="field">
          <label>Адрес</label>
          <input class="input" formControlName="address" />
        </div>
        <div class="field">
          <label>Контактный телефон</label>
          <input class="input" formControlName="contactNumber" />
          @if (oInvalid('contactNumber')) { <span class="field-error">Формат: +71234567890</span> }
        </div>
        <div class="field">
          <label>Email</label>
          <input class="input" formControlName="email" />
          @if (oInvalid('email')) { <span class="field-error">Некорректный email</span> }
        </div>
        <button class="btn btn-primary btn-block" type="submit" [disabled]="savingOrg()">Сохранить</button>
      </form>
    </app-drawer>
  `,
  styles: [
    `
      .tabs { display: flex; gap: 4px; margin: 12px 0 20px; border-bottom: 1px solid var(--border); }
      .tab { background: none; border: 0; padding: 10px 16px; cursor: pointer; font: inherit; font-weight: 600; color: var(--gray-500); border-bottom: 2px solid transparent; }
      .tab.active { color: var(--green-700); border-bottom-color: var(--green-500); }
      .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .list { display: flex; flex-direction: column; gap: 12px; }
      .org-card { display: flex; align-items: center; gap: 16px; }
      .org-card > .row { margin-left: auto; }
      @media (max-width: 600px) { .grid2 { grid-template-columns: 1fr; } }
    `,
  ],
})
export class ProfileComponent {
  private users = inject(UserService);
  protected auth = inject(AuthService);
  private fb = inject(FormBuilder);

  tab = signal<Tab>('profile');
  banner = signal<string | null>(null);

  // profile
  profile = signal<BaseUserInfo | null>(null);
  loadingProfile = signal(true);
  savingProfile = signal(false);
  profileError = signal<AppError | null>(null);
  profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    surname: ['', [Validators.required, Validators.minLength(2)]],
    birthDate: [''],
    address: [''],
    phoneNumber: ['', Validators.pattern(PHONE)],
  });

  // password
  savingPassword = signal(false);
  passwordError = signal<AppError | null>(null);
  passwordForm = this.fb.nonNullable.group({
    oldPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64)]],
  });

  // passport
  passport = signal<PassportInfo | null>(null);
  loadingPassport = signal(false);
  passportOpen = signal(false);
  savingPassportForm = signal(false);
  passportFormError = signal<AppError | null>(null);
  passportForm = this.fb.nonNullable.group({
    passportNumber: ['', [Validators.required, Validators.pattern(PASSPORT_NO)]],
    issueDate: ['', Validators.required],
    expiryDate: ['', Validators.required],
    issuedBy: ['', [Validators.required, Validators.maxLength(255)]],
  });
  private passportExists = false;

  // organizations
  orgs = signal<OrganizationDetails[]>([]);
  loadingOrgs = signal(false);
  orgOpen = signal(false);
  editingOrg = signal<OrganizationDetails | null>(null);
  savingOrg = signal(false);
  orgFormError = signal<AppError | null>(null);
  orgForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    licenseNumber: ['', [Validators.required, Validators.pattern(LICENSE)]],
    address: ['', Validators.maxLength(255)],
    contactNumber: ['', [Validators.required, Validators.pattern(PHONE)]],
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    this.loadProfile();
    this.loadPassport();
    this.loadOrgs();
  }

  private flash(msg: string): void {
    this.banner.set(msg);
    setTimeout(() => this.banner.set(null), 3500);
  }

  // ---- profile ----
  loadProfile(): void {
    this.loadingProfile.set(true);
    this.users.getProfile().subscribe({
      next: (u) => {
        this.profile.set(u);
        this.profileForm.patchValue({
          name: u.name,
          surname: u.surname,
          birthDate: u.birthDate,
          address: u.address,
          phoneNumber: u.phoneNumber,
        });
        this.loadingProfile.set(false);
      },
      error: (err) => {
        this.profileError.set(appErrorOf(err));
        this.loadingProfile.set(false);
      },
    });
  }
  pInvalid(n: string): boolean {
    const c = this.profileForm.get(n);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile.set(true);
    this.profileError.set(null);
    this.users.updateProfile(this.profileForm.getRawValue()).subscribe({
      next: (u) => {
        this.profile.set(u);
        this.savingProfile.set(false);
        this.flash('Данные сохранены');
      },
      error: (err) => {
        this.profileError.set(appErrorOf(err));
        this.savingProfile.set(false);
      },
    });
  }

  // ---- password ----
  pwInvalid(n: string): boolean {
    const c = this.passwordForm.get(n);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword.set(true);
    this.passwordError.set(null);
    this.users.changePassword(this.passwordForm.getRawValue()).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.flash('Пароль изменён');
      },
      error: (err) => {
        this.passwordError.set(appErrorOf(err));
        this.savingPassword.set(false);
      },
    });
  }

  // ---- passport ----
  loadPassport(): void {
    this.loadingPassport.set(true);
    this.users.getPassports().subscribe({
      next: (list) => {
        this.passport.set(list[0] ?? null);
        this.passportExists = list.length > 0;
        this.loadingPassport.set(false);
      },
      error: () => {
        this.passport.set(null);
        this.loadingPassport.set(false);
      },
    });
  }
  psInvalid(n: string): boolean {
    const c = this.passportForm.get(n);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
  editPassport(p: PassportInfo | null): void {
    this.passportFormError.set(null);
    this.passportForm.reset({
      passportNumber: p?.passportNumber ?? '',
      issueDate: p?.issueDate ?? '',
      expiryDate: p?.expiryDate ?? '',
      issuedBy: p?.issuedBy ?? '',
    });
    this.passportOpen.set(true);
  }
  savePassport(): void {
    if (this.passportForm.invalid) {
      this.passportForm.markAllAsTouched();
      return;
    }
    this.savingPassportForm.set(true);
    this.passportFormError.set(null);
    const body = this.passportForm.getRawValue();
    const req$ = this.passportExists
      ? this.users.updatePassport(body)
      : this.users.createPassport(body);
    req$.subscribe({
      next: (list) => {
        this.passport.set(list[0] ?? null);
        this.passportExists = list.length > 0;
        this.savingPassportForm.set(false);
        this.passportOpen.set(false);
        this.flash('Паспорт сохранён');
      },
      error: (err) => {
        this.passportFormError.set(appErrorOf(err));
        this.savingPassportForm.set(false);
      },
    });
  }
  deletePassport(): void {
    this.users.deletePassport().subscribe({
      next: () => {
        this.passport.set(null);
        this.passportExists = false;
        this.flash('Паспорт удалён');
      },
      error: (err) => this.profileError.set(appErrorOf(err)),
    });
  }

  // ---- organizations ----
  loadOrgs(): void {
    this.loadingOrgs.set(true);
    this.users.getOrganizations().subscribe({
      next: (list) => {
        this.orgs.set(list);
        this.loadingOrgs.set(false);
      },
      error: () => {
        this.orgs.set([]);
        this.loadingOrgs.set(false);
      },
    });
  }
  oInvalid(n: string): boolean {
    const c = this.orgForm.get(n);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
  editOrg(o: OrganizationDetails | null): void {
    this.editingOrg.set(o);
    this.orgFormError.set(null);
    this.orgForm.reset({
      name: o?.name ?? '',
      licenseNumber: o?.licenseNumber ?? '',
      address: o?.address ?? '',
      contactNumber: o?.contactNumber ?? '',
      email: o?.email ?? '',
    });
    this.orgOpen.set(true);
  }
  saveOrg(): void {
    if (this.orgForm.invalid) {
      this.orgForm.markAllAsTouched();
      return;
    }
    this.savingOrg.set(true);
    this.orgFormError.set(null);
    const editing = this.editingOrg();
    const v = this.orgForm.getRawValue();
    const id = editing?.organizationId ?? editing?.id;
    const req$ =
      editing && id != null
        ? this.users.updateOrganization(id, { ...v, organizationId: id })
        : this.users.createOrganization(v);
    req$.subscribe({
      next: (list) => {
        this.orgs.set(list.length ? list : this.orgs());
        this.savingOrg.set(false);
        this.orgOpen.set(false);
        this.flash('Организация сохранена');
        this.loadOrgs();
      },
      error: (err) => {
        this.orgFormError.set(appErrorOf(err));
        this.savingOrg.set(false);
      },
    });
  }
  deleteOrg(o: OrganizationDetails): void {
    const id = o.organizationId ?? o.id;
    if (id == null) return;
    this.users.deleteOrganization(id).subscribe({
      next: () => {
        this.orgs.update((list) => list.filter((x) => (x.organizationId ?? x.id) !== id));
        this.flash('Организация удалена');
      },
      error: (err) => this.orgFormError.set(appErrorOf(err)),
    });
  }
}
