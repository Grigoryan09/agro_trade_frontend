import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { OrderService } from '../../core/services/order.service';
import { OrderDetails } from '../../core/models/order.models';
import {
  ORDER_MANAGE_ROLES,
  ORDER_SELLER_MANAGE_ROLES,
  ORDER_STATUSES,
  OrderStatus,
} from '../../core/models/enums';
import { AppError } from '../../core/models/api.models';
import { appErrorOf, formatMoney } from '../../core/util/format';
import { AuthService } from '../../core/services/auth.service';
import { ChatLauncherService, orderChatContext, orderParties } from '../../chat/chat-launcher.service';
import { ChatRegistryService } from '../../chat/chat-registry.service';

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Приём предложений',
  PROCESSING: 'В работе',
  COMPLETED: 'Завершён',
  CANCELED: 'Отменён',
  DELETED: 'Удалён',
};
const STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING: 'badge-green',
  PROCESSING: 'badge-blue',
  COMPLETED: 'badge-gray',
  CANCELED: 'badge-red',
  DELETED: 'badge-red',
};

@Component({
  selector: 'app-orders',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <div class="muted" style="font-size:0.85rem">Главная / Закупки</div>
      <h1>Закупки</h1>

      <!-- toggle pills -->
      <div class="pills">
        <button class="pill active">Заявки</button>
        <button class="pill" (click)="goCatalog()">Каталог товаров</button>
      </div>

      <!-- status chips -->
      <div class="chips">
        <button class="chip" [class.active]="filter() === null" (click)="setFilter(null)">
          Все
        </button>
        @for (s of statuses; track s) {
          <button class="chip" [class.active]="filter() === s" (click)="setFilter(s)">
            {{ label(s) }}
          </button>
        }
      </div>

      @if (loading()) {
        @for (s of [1, 2, 3]; track s) {
          <div class="card" style="margin-top:16px"><div class="skeleton" style="height:72px"></div></div>
        }
      } @else if (error()) {
        <div class="state">
          <div class="state-icon">⚠️</div>
          <p>{{ error()!.message }}</p>
          <button class="btn btn-secondary" (click)="reload()">Повторить</button>
        </div>
      } @else if (visible().length === 0) {
        <div class="state"><div class="state-icon">📭</div><p>Заявок нет</p></div>
      } @else {
        <div class="list">
          @for (o of visible(); track o.id; let i = $index) {
            <article class="card order-card">
              <div class="order-main">
                <div class="row" style="gap:10px">
                  <span class="badge" [class]="badge(o.orderStatus)">{{ label(o.orderStatus) }}</span>
                  <span class="muted">№ {{ o.id ?? i + 1 }}</span>
                </div>
                <h3 class="order-title">{{ o.productDetailsDto?.productName ?? 'Товар' }}</h3>
                <div class="muted">Количество: {{ o.quantity }} · Сумма: {{ money(o.totalPrice) }}</div>
              </div>
              <div class="order-meta">
                <div><span class="m-label">Продавец</span>{{ party(o.sellerDetailsDto) }}</div>
                <div><span class="m-label">Покупатель</span>{{ party(o.buyerDetailsDto) }}</div>
                @if (o.managerDetailsDto) {
                  <div><span class="m-label">Менеджер</span>{{ party(o.managerDetailsDto) }}</div>
                }
              </div>
              <div class="order-actions">
                @if (canEditStatus()) {
                  <label class="field" style="gap:2px">
                    <span class="m-label">Статус</span>
                    <select
                      class="select"
                      (change)="changeStatus(o, $event)"
                      [disabled]="!o.id || savingId() === o.id"
                      [title]="o.id ? '' : 'Изменение статуса недоступно: сервер не возвращает id заказа (CONTRACT-GAPS #13)'"
                    >
                      @for (s of statuses; track s) {
                        <option [value]="s" [selected]="s === o.orderStatus">{{ label(s) }}</option>
                      }
                    </select>
                  </label>
                }
                <button class="btn btn-secondary btn-sm" (click)="openChat(o)">💬 Чат</button>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .pills { display: inline-flex; gap: 4px; background: var(--gray-100); padding: 4px; border-radius: 999px; margin: 8px 0 16px; }
      .pill { border: 0; background: none; padding: 8px 18px; border-radius: 999px; cursor: pointer; font: inherit; font-weight: 600; color: var(--gray-700); }
      .pill.active { background: var(--green-500); color: #fff; }
      .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
      .chip { border: 1px solid var(--border); background: #fff; padding: 6px 14px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 0.85rem; }
      .chip.active { background: var(--green-100); border-color: var(--green-300); color: var(--green-700); font-weight: 600; }
      .list { display: flex; flex-direction: column; gap: 14px; }
      .order-card { display: grid; grid-template-columns: 1fr 240px 200px; gap: 18px; align-items: center; }
      .order-title { margin: 6px 0 4px; }
      .order-meta { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; }
      .m-label { display: block; color: var(--text-muted); font-size: 0.75rem; }
      .order-actions { display: flex; flex-direction: column; gap: 8px; align-items: stretch; }
      @media (max-width: 860px) { .order-card { grid-template-columns: 1fr; } }
    `,
  ],
})
export class OrdersComponent {
  private orders = inject(OrderService);
  private auth = inject(AuthService);
  private chat = inject(ChatLauncherService);
  private registry = inject(ChatRegistryService);

  private all = signal<OrderDetails[]>([]);
  loading = signal(true);
  error = signal<AppError | null>(null);
  filter = signal<OrderStatus | null>(null);
  savingId = signal<number | null>(null);

  readonly statuses = ORDER_STATUSES;
  readonly money = formatMoney;

  canManage = computed(() => {
    const role = this.auth.role();
    return !!role && ORDER_MANAGE_ROLES.includes(role);
  });

  canManageOwn = computed(() => {
    const role = this.auth.role();
    return !!role && ORDER_SELLER_MANAGE_ROLES.includes(role);
  });

  canEditStatus = computed(() => this.canManage() || this.canManageOwn());

  visible = computed(() => {
    const f = this.filter();
    return this.all().filter((o) => !f || o.orderStatus === f);
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const seesAll = this.canManage() || this.canManageOwn();
    const source$ = seesAll ? this.orders.list({ size: 50 }) : this.orders.mine({ size: 50 });
    source$.subscribe({
      next: (items) => {
        const scoped =
          this.canManageOwn() && !this.canManage()
            ? items.filter((o) => Number(o.sellerDetailsDto?.sellerId) === this.auth.userId())
            : items;
        this.all.set(scoped);
        this.seedChatParties(scoped);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(appErrorOf(err, 'Не удалось загрузить заявки'));
        this.loading.set(false);
      },
    });
  }

  setFilter(s: OrderStatus | null): void {
    this.filter.set(s);
  }

  label(s: OrderStatus): string {
    return STATUS_LABEL[s];
  }
  badge(s: OrderStatus): string {
    return STATUS_BADGE[s];
  }
  party(p: OrderDetails['buyerDetailsDto']): string {
    const u = p?.baseUserInfoDto;
    if (!u) return '—';
    return [u.name, u.surname].filter(Boolean).join(' ') || u.username || u.email || '—';
  }

  changeStatus(o: OrderDetails, e: Event): void {
    const orderStatus = (e.target as HTMLSelectElement).value as OrderStatus;
    if (!o.id || orderStatus === o.orderStatus) return;
    this.savingId.set(o.id);
    this.orders.updateStatus(o.id, { orderStatus }).subscribe({
      next: () => {
        this.all.update((list) =>
          list.map((x) => (x.id === o.id ? { ...x, orderStatus } : x)),
        );
        this.savingId.set(null);
      },
      error: (err) => {
        this.error.set(appErrorOf(err, 'Не удалось изменить статус'));
        this.savingId.set(null);
      },
    });
  }

  private seedChatParties(items: OrderDetails[]): void {
    for (const o of items) {
      const parties = orderParties(o);
      this.registry.rememberParties(parties);
      if (o.chatId == null) continue;
      if (!parties.length) continue;
      this.registry.remember({ chatId: o.chatId, name: `Чат по заказу №${o.id ?? ''}`, parties });
    }
  }

  openChat(o: OrderDetails): void {
    this.chat.open(orderChatContext(o));
  }

  goCatalog(): void {
    location.assign('/products');
  }
}
