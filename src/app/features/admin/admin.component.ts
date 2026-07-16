import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminService } from '../../core/services/admin.service';
import { BankingService } from '../../core/services/banking.service';
import { ProductInfo } from '../../core/models/product.models';
import { News } from '../../core/models/news.models';
import { OrderDetails } from '../../core/models/order.models';
import { OrganizationDetails, PassportInfo } from '../../core/models/user.models';
import { UserForAdmin } from '../../core/models/admin.models';
import { ContractDto } from '../../core/models/banking.models';
import { ORDER_STATUSES, OrderStatus, ROLES, Role } from '../../core/models/enums';
import { AppError } from '../../core/models/api.models';
import { appErrorOf, formatMoney } from '../../core/util/format';
import { DrawerComponent } from '../../shared/drawer.component';
import { ToastService } from '../../shared/toast.service';
import { ConfirmService } from '../../shared/confirm.service';

type Tab = 'orders' | 'users' | 'products' | 'news' | 'organizations' | 'contracts';

@Component({
  selector: 'app-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DrawerComponent],
  template: `
    <div class="admin">
      <aside class="admin-menu card">
        <h3>Админка</h3>
        <button class="m-item" [class.active]="tab() === 'orders'" (click)="setTab('orders')">
          📦 Заказы
        </button>
        <button class="m-item" [class.active]="tab() === 'users'" (click)="setTab('users')">
          👥 Пользователи
        </button>
        <button class="m-item" [class.active]="tab() === 'products'" (click)="setTab('products')">
          🌾 Товары
        </button>
        <button class="m-item" [class.active]="tab() === 'news'" (click)="setTab('news')">
          📰 Новости
        </button>
        <button
          class="m-item"
          [class.active]="tab() === 'organizations'"
          (click)="setTab('organizations')"
        >
          🏢 Организации
        </button>
        <button class="m-item" [class.active]="tab() === 'contracts'" (click)="setTab('contracts')">
          💳 Контракты
        </button>
      </aside>

      <section class="admin-body">
        @if (error()) {
          <div class="alert alert-error" style="margin-bottom:12px">{{ error()!.message }}</div>
        }

        <!-- ORDERS -->
        @if (tab() === 'orders') {
          <div class="row">
            <h2>Заказы</h2>
            <span class="spacer"></span>
            <select class="select" [value]="orderStatus() ?? ''" (change)="filterOrders($event)">
              <option value="">Все статусы</option>
              @for (s of statuses; track s) {
                <option [value]="s">{{ s }}</option>
              }
            </select>
          </div>
          @if (loading()) {
            <div class="card"><div class="skeleton" style="height:120px"></div></div>
          } @else {
            <table class="t">
              <thead>
                <tr><th>№</th><th>Товар</th><th>Кол-во</th><th>Сумма</th><th>Статус</th><th></th></tr>
              </thead>
              <tbody>
                @for (o of orders(); track o.id) {
                  <tr>
                    <td>{{ o.id }}</td>
                    <td>{{ o.productDetailsDto?.productName ?? '—' }}</td>
                    <td>{{ o.quantity }}</td>
                    <td>{{ money(o.totalPrice) }}</td>
                    <td><span class="badge badge-gray">{{ o.orderStatus }}</span></td>
                    <td class="actions">
                      <button class="btn btn-danger btn-sm" [disabled]="!o.id"
                        [title]="o.id ? '' : 'Недоступно: сервер не возвращает id заказа (CONTRACT-GAPS #13)'"
                        (click)="deleteOrder(o)">🗑</button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="muted">Нет заказов</td></tr>
                }
              </tbody>
            </table>
          }
        }

        <!-- USERS -->
        @if (tab() === 'users') {
          <div class="row">
            <h2>Пользователи</h2>
            <span class="spacer"></span>
            <select class="select" [value]="userRole() ?? ''" (change)="filterUsersByRole($event)">
              <option value="">Все роли</option>
              @for (r of roles; track r) {
                <option [value]="r">{{ r }}</option>
              }
            </select>
            <input
              class="input"
              style="max-width:220px"
              placeholder="Поиск…"
              [value]="userSearch()"
              (keyup.enter)="applyUserSearch($event)"
            />
          </div>
          @if (loading()) {
            <div class="card"><div class="skeleton" style="height:120px"></div></div>
          } @else {
            <table class="t">
              <thead>
                <tr><th>Имя</th><th>Email</th><th>Роли</th><th>Статус</th><th></th></tr>
              </thead>
              <tbody>
                @for (u of users(); track u.id) {
                  <tr>
                    <td>{{ u.name }} {{ u.surname }}</td>
                    <td>{{ u.email }}</td>
                    <td>{{ u.roles?.join(', ') }}</td>
                    <td>
                      <span class="badge" [class]="u.active ? 'badge-green' : 'badge-gray'">
                        {{ u.active ? 'Активен' : 'Заблокирован' }}
                      </span>
                    </td>
                    <td class="actions">
                      <button class="btn btn-secondary btn-sm" (click)="editRoles(u)">Роли</button>
                      <button class="btn btn-secondary btn-sm" (click)="toggleStatus(u)">
                        {{ u.active ? 'Заблокировать' : 'Разблокировать' }}
                      </button>
                      <button class="btn btn-ghost btn-sm" (click)="viewPassport(u)">Паспорт</button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="muted">Пользователи не найдены</td></tr>
                }
              </tbody>
            </table>
          }
        }

        <!-- PRODUCTS -->
        @if (tab() === 'products') {
          <h2>Товары</h2>
          @if (loading()) {
            <div class="card"><div class="skeleton" style="height:120px"></div></div>
          } @else {
            <table class="t">
              <thead>
                <tr><th>Название</th><th>Цена</th><th>Категория</th><th>Статус</th><th></th></tr>
              </thead>
              <tbody>
                @for (p of products(); track p.id) {
                  <tr>
                    <td>{{ p.name }}</td>
                    <td>{{ money(p.price) }}</td>
                    <td>{{ p.category }}</td>
                    <td><span class="badge badge-gray">{{ p.status }}</span></td>
                    <td class="actions">
                      <button class="btn btn-danger btn-sm" (click)="deleteProduct(p)">🗑</button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="muted">Нет товаров</td></tr>
                }
              </tbody>
            </table>
          }
        }

        <!-- NEWS -->
        @if (tab() === 'news') {
          <h2>Новости</h2>
          @if (loading()) {
            <div class="card"><div class="skeleton" style="height:120px"></div></div>
          } @else {
            <table class="t">
              <thead><tr><th>Заголовок</th><th></th></tr></thead>
              <tbody>
                @for (n of news(); track n.id) {
                  <tr>
                    <td>{{ n.title }}</td>
                    <td class="actions">
                      <button class="btn btn-danger btn-sm" [disabled]="!n.id"
                        [title]="n.id ? '' : 'Недоступно: сервер не возвращает id новости (CONTRACT-GAPS #13)'"
                        (click)="deleteNews(n)">🗑</button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="2" class="muted">Нет новостей</td></tr>
                }
              </tbody>
            </table>
          }
        }

        <!-- ORGANIZATIONS -->
        @if (tab() === 'organizations') {
          <h2>Организации</h2>
          @if (loading()) {
            <div class="card"><div class="skeleton" style="height:120px"></div></div>
          } @else {
            <table class="t">
              <thead>
                <tr><th>Название</th><th>Лицензия</th><th>Адрес</th><th>Контакт</th><th>Email</th></tr>
              </thead>
              <tbody>
                @for (org of organizations(); track org.organizationId ?? org.id ?? org.name) {
                  <tr>
                    <td>{{ org.name }}</td>
                    <td>{{ org.licenseNumber }}</td>
                    <td>{{ org.address }}</td>
                    <td>{{ org.contactNumber }}</td>
                    <td>{{ org.email }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="muted">Нет организаций</td></tr>
                }
              </tbody>
            </table>
          }
        }

        <!-- CONTRACTS -->
        @if (tab() === 'contracts') {
          <h2>Контракты</h2>
          @if (loading()) {
            <div class="card"><div class="skeleton" style="height:120px"></div></div>
          } @else {
            <table class="t">
              <thead><tr><th>№</th><th>Сумма</th><th>Статус</th><th></th></tr></thead>
              <tbody>
                @for (c of contracts(); track c.id) {
                  <tr>
                    <td>{{ c.id }}</td>
                    <td>{{ money(c.approvedAmount) }}</td>
                    <td>
                      <span class="badge" [class]="isCompleted(c) ? 'badge-green' : 'badge-yellow'">
                        {{ isCompleted(c) ? 'COMPLETED' : 'PENDING' }}
                      </span>
                    </td>
                    <td class="actions">
                      @if (c.documentUrl) {
                        <a class="btn btn-ghost btn-sm" [href]="c.documentUrl" target="_blank" rel="noopener" download>
                          Скачать
                        </a>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="muted">Нет контрактов</td></tr>
                }
              </tbody>
            </table>
            <p class="muted" style="margin-top:8px">
              ⚠️ Банковские офферы создавать нельзя — в Banking API только GET /offers.
            </p>
          }
        }
      </section>
    </div>

    <!-- Roles drawer -->
    <app-drawer
      [open]="rolesOpen()"
      [title]="'Роли: ' + (editingUser()?.username ?? '')"
      (close)="rolesOpen.set(false)"
    >
      @if (editingUser()) {
        <div class="stack">
          <p class="muted">Минимум одна роль обязательна.</p>
          @for (r of roles; track r) {
            <label class="check">
              <input
                type="checkbox"
                [checked]="roleDraft().includes(r)"
                (change)="toggleRoleDraft(r)"
              />
              {{ r }}
            </label>
          }
          <button
            class="btn btn-primary btn-block"
            type="button"
            [disabled]="saving() || roleDraft().length === 0"
            (click)="saveRoles()"
          >
            Сохранить
          </button>
        </div>
      }
    </app-drawer>

    <!-- Passport drawer (PII) -->
    <app-drawer
      [open]="passportOpen()"
      [title]="'Паспортные данные'"
      (close)="passportOpen.set(false)"
    >
      <div class="stack">
        <div class="alert alert-info">
          🔒 Персональные данные. Просматривайте только при необходимости.
        </div>
        @if (passportLoading()) {
          <div class="skeleton" style="height:80px"></div>
        } @else if (passports().length === 0) {
          <p class="muted">Паспортные данные отсутствуют.</p>
        } @else {
          @for (p of passports(); track p.passportNumber) {
            <div class="card" style="box-shadow:none">
              <div><strong>Номер:</strong> {{ p.passportNumber }}</div>
              <!-- issuedBy/issueDate/expiryDate are NOT returned by GET today (see CONTRACT-GAPS); fall back to —. -->
              <div><strong>Выдан:</strong> {{ p.issuedBy || '—' }}</div>
              <div><strong>Дата выдачи:</strong> {{ p.issueDate || '—' }}</div>
              <div><strong>Действует до:</strong> {{ p.expiryDate || '—' }}</div>
            </div>
          }
        }
      </div>
    </app-drawer>
  `,
  styles: [
    `
      .admin { display: grid; grid-template-columns: 220px 1fr; gap: 20px; max-width: 1200px; margin: 0 auto; padding: 24px; }
      .admin-menu { align-self: start; display: flex; flex-direction: column; gap: 4px; position: sticky; top: 120px; }
      .m-item { text-align: left; background: none; border: 0; padding: 10px 12px; border-radius: var(--radius-sm); cursor: pointer; font: inherit; font-weight: 600; color: var(--gray-700); }
      .m-item:hover { background: var(--gray-100); }
      .m-item.active { background: var(--green-100); color: var(--green-700); }
      .t { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
      .t th, .t td { text-align: left; padding: 12px 14px; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
      .t th { background: var(--gray-50); font-size: 0.78rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.03em; }
      .t tr:last-child td { border-bottom: 0; }
      .actions { display: flex; gap: 6px; flex-wrap: wrap; }
      .check { display: flex; align-items: center; gap: 8px; font-weight: 600; }
      @media (max-width: 760px) { .admin { grid-template-columns: 1fr; } }
    `,
  ],
})
export class AdminComponent {
  private admin = inject(AdminService);
  private banking = inject(BankingService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  tab = signal<Tab>('orders');
  loading = signal(true);
  error = signal<AppError | null>(null);
  saving = signal(false);

  orders = signal<OrderDetails[]>([]);
  users = signal<UserForAdmin[]>([]);
  products = signal<ProductInfo[]>([]);
  news = signal<News[]>([]);
  organizations = signal<OrganizationDetails[]>([]);
  contracts = signal<ContractDto[]>([]);

  // filters
  orderStatus = signal<OrderStatus | null>(null);
  userRole = signal<Role | null>(null);
  userSearch = signal('');

  // roles drawer
  rolesOpen = signal(false);
  editingUser = signal<UserForAdmin | null>(null);
  roleDraft = signal<Role[]>([]);

  // passport drawer
  passportOpen = signal(false);
  passportLoading = signal(false);
  passports = signal<PassportInfo[]>([]);

  readonly statuses = ORDER_STATUSES;
  readonly roles = ROLES;
  readonly money = formatMoney;

  constructor() {
    this.load();
  }

  setTab(t: Tab): void {
    this.tab.set(t);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const done = () => this.loading.set(false);
    const fail = (err: unknown) => {
      this.error.set(appErrorOf(err));
      this.loading.set(false);
    };
    switch (this.tab()) {
      case 'orders':
        this.admin
          .listOrders({ orderStatus: this.orderStatus() ?? undefined, size: 100 })
          .subscribe({ next: (x) => (this.orders.set(x), done()), error: fail });
        break;
      case 'users':
        this.admin
          .listUsers({ role: this.userRole() ?? undefined, search: this.userSearch() || undefined, size: 100 })
          .subscribe({ next: (x) => (this.users.set(x), done()), error: fail });
        break;
      case 'products':
        this.admin.listProducts({ size: 100 }).subscribe({ next: (x) => (this.products.set(x), done()), error: fail });
        break;
      case 'news':
        this.admin.listNews({ size: 100 }).subscribe({ next: (x) => (this.news.set(x), done()), error: fail });
        break;
      case 'organizations':
        this.admin.listOrganizations({ size: 100 }).subscribe({ next: (x) => (this.organizations.set(x), done()), error: fail });
        break;
      case 'contracts':
        this.banking.listContracts({ size: 100 }).subscribe({
          next: (x) => (this.contracts.set(x), done()),
          error: () => (this.contracts.set([]), done()), // banking 400 = empty
        });
        break;
    }
  }

  // ---- orders ----
  filterOrders(e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    this.orderStatus.set(v ? (v as OrderStatus) : null);
    this.load();
  }
  async deleteOrder(o: OrderDetails): Promise<void> {
    if (o.id == null) return;
    const ok = await this.confirm.ask({
      title: 'Удалить заказ?',
      message: `Заказ №${o.id} будет помечен как удалённый.`,
      confirmText: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    this.admin.deleteOrder(o.id).subscribe({
      next: () => {
        this.orders.update((l) => l.filter((x) => x.id !== o.id));
        this.toast.success('Заказ удалён');
      },
      error: (err) => this.toast.error(appErrorOf(err).message),
    });
  }

  // ---- users ----
  filterUsersByRole(e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    this.userRole.set(v ? (v as Role) : null);
    this.load();
  }
  applyUserSearch(e: Event): void {
    this.userSearch.set((e.target as HTMLInputElement).value.trim());
    this.load();
  }
  editRoles(u: UserForAdmin): void {
    this.editingUser.set(u);
    this.roleDraft.set([...(u.roles ?? [])]);
    this.rolesOpen.set(true);
  }
  toggleRoleDraft(r: Role): void {
    this.roleDraft.update((list) =>
      list.includes(r) ? list.filter((x) => x !== r) : [...list, r],
    );
  }
  saveRoles(): void {
    const u = this.editingUser();
    const roles = this.roleDraft();
    if (!u || roles.length === 0) return;
    this.saving.set(true);
    this.admin.updateUserRoles(u.id, { roles }).subscribe({
      next: (updated) => {
        this.users.update((l) => l.map((x) => (x.id === u.id ? { ...x, roles: updated?.roles ?? roles } : x)));
        this.saving.set(false);
        this.rolesOpen.set(false);
        this.toast.success('Роли обновлены');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(appErrorOf(err).message);
      },
    });
  }
  async toggleStatus(u: UserForAdmin): Promise<void> {
    const next = !u.active;
    const ok = await this.confirm.ask({
      title: next ? 'Разблокировать пользователя?' : 'Заблокировать пользователя?',
      message: `${u.name} ${u.surname} (${u.email})`,
      confirmText: next ? 'Разблокировать' : 'Заблокировать',
      danger: !next,
    });
    if (!ok) return;
    this.admin.updateUserStatus(u.id, { active: next }).subscribe({
      next: () => {
        this.users.update((l) => l.map((x) => (x.id === u.id ? { ...x, active: next } : x)));
        this.toast.success(next ? 'Пользователь разблокирован' : 'Пользователь заблокирован');
      },
      error: (err) => this.toast.error(appErrorOf(err).message),
    });
  }
  viewPassport(u: UserForAdmin): void {
    this.passports.set([]);
    this.passportOpen.set(true);
    this.passportLoading.set(true);
    this.admin.getUserPassport(u.id).subscribe({
      next: (p) => {
        this.passports.set(p);
        this.passportLoading.set(false);
      },
      error: (err) => {
        this.passportLoading.set(false);
        this.toast.error(appErrorOf(err).message);
      },
    });
  }

  // ---- products ----
  async deleteProduct(p: ProductInfo): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Удалить товар?',
      message: `«${p.name}» будет помечен как удалённый.`,
      confirmText: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    this.admin.deleteProduct(p.id).subscribe({
      next: () => {
        this.products.update((l) => l.filter((x) => x.id !== p.id));
        this.toast.success('Товар удалён');
      },
      error: (err) => this.toast.error(appErrorOf(err).message),
    });
  }

  // ---- news ----
  async deleteNews(n: News): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Удалить новость?',
      message: `«${n.title}» будет удалена безвозвратно.`,
      confirmText: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    this.admin.deleteNews(n.id).subscribe({
      next: () => {
        this.news.update((l) => l.filter((x) => x.id !== n.id));
        this.toast.success('Новость удалена');
      },
      error: (err) => this.toast.error(appErrorOf(err).message),
    });
  }

  // ---- contracts ----
  isCompleted(c: ContractDto): boolean {
    return c.documentStatus === 'COMPLETED' || !!c.documentUrl;
  }
}