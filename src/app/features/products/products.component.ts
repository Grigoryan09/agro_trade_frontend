import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';
import { OrderService } from '../../core/services/order.service';
import { MediaService } from '../../core/services/media.service';
import { ProductInfo } from '../../core/models/product.models';
import { Media } from '../../core/models/media.models';
import { AppError } from '../../core/models/api.models';
import { appErrorOf, formatMoney } from '../../core/util/format';
import { DrawerComponent } from '../../shared/drawer.component';
import { ToastService } from '../../shared/toast.service';
import { ConfirmService } from '../../shared/confirm.service';
import { ChatLauncherService } from '../../chat/chat-launcher.service';
import { AuthService } from '../../core/services/auth.service';
import { HasRoleDirective } from '../../core/directives/has-role.directive';
import { PRODUCT_CREATE_ROLES, categoryLabel } from '../../core/models/enums';

@Component({
  selector: 'app-products',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DrawerComponent, HasRoleDirective],
  template: `
    <div class="container">
      <div class="row">
        <div>
          <h1>Урожай</h1>
          <p class="muted">Каталог семян и продукции от проверенных производителей</p>
        </div>
        <span class="spacer"></span>
        <button class="btn btn-primary" *appHasRole="createRoles" (click)="openCreate()">
          + Разместить товар
        </button>
      </div>

      <div class="catalog">
        <!-- Sidebar -->
        <aside class="filters card">
          <h4>Категория</h4>
          <ul class="filter-tree">
            <li>
              <button
                class="filter-item"
                [class.active]="category() === null"
                (click)="setCategory(null)"
              >
                Все культуры
              </button>
            </li>
            @for (c of categories(); track c) {
              <li>
                <button
                  class="filter-item"
                  [class.active]="category() === c"
                  (click)="setCategory(c)"
                >
                  {{ catLabel(c) }}
                </button>
              </li>
            }
          </ul>
          <h4 style="margin-top:20px">Поиск</h4>
          <input
            class="input"
            placeholder="Название товара…"
            [value]="search()"
            (input)="onSearch($event)"
          />
        </aside>

        <!-- List -->
        <section class="results">
          @if (loading()) {
            @for (s of [1, 2, 3, 4]; track s) {
              <div class="card product-card">
                <div class="skeleton" style="height:96px"></div>
              </div>
            }
          } @else if (error()) {
            <div class="state">
              <div class="state-icon">⚠️</div>
              <p>{{ error()!.message }}</p>
              <button class="btn btn-secondary" (click)="reload()">Повторить</button>
            </div>
          } @else if (visible().length === 0) {
            <div class="state">
              <div class="state-icon">🌱</div>
              <p>Товары не найдены</p>
            </div>
          } @else {
            @for (p of visible(); track p.id) {
              <article class="card product-card">
                @if (p.media?.[0]?.url; as img) {
                  <div class="product-thumb"><img [src]="img" [alt]="p.name" /></div>
                } @else {
                  <div class="product-thumb">🌾</div>
                }
                <div class="product-main">
                  <span class="badge badge-green">Рассрочка доступна</span>
                  <h3 class="product-title">{{ p.name }}</h3>
                  <p class="product-desc muted">{{ p.description }}</p>
                  <div class="attrs">
                    <span class="attr"
                      ><span class="attr-label">Категория</span> {{ catLabel(p.category) }}</span
                    >
                    <span class="attr"
                      ><span class="attr-label">Продавец</span>
                      {{ p.sellerInfoDto.sellerName }}</span
                    >
                    @if (p.sellerInfoDto.organization?.name) {
                      <span class="attr"
                        ><span class="attr-label">Организация</span>
                        {{ p.sellerInfoDto.organization!.name }}</span
                      >
                    }
                  </div>
                </div>
                <div class="product-side">
                  <div class="price">{{ money(p.price) }}</div>
                  @if (isOwn(p)) {
                    <span class="badge badge-own">Ваш товар</span>
                  } @else {
                    <button class="btn btn-secondary btn-block" (click)="openOrder(p)">Купить</button>
                    <button class="btn btn-ghost btn-sm btn-block" (click)="contact(p)">
                      Связаться с продавцом
                    </button>
                  }
                  @if (canEdit(p) || canDelete(p)) {
                    <div class="acts">
                      @if (canEdit(p)) {
                        <button class="btn btn-secondary btn-sm" (click)="openEdit(p)">
                          Редактировать
                        </button>
                      }
                      @if (canDelete(p)) {
                        <button class="btn btn-danger btn-sm" (click)="remove(p)">Удалить</button>
                      }
                    </div>
                  }
                </div>
              </article>
            }
          }
        </section>
      </div>
    </div>

    <!-- Order creation drawer -->
    <app-drawer [open]="!!orderTarget()" [title]="'Оформление заказа'" (close)="closeOrder()">
      @if (orderTarget(); as p) {
        <form class="stack" [formGroup]="orderForm" (ngSubmit)="submitOrder()">
          @if (orderError()) {
            <div class="alert alert-error">{{ orderError()!.message }}</div>
          }
          <div class="card" style="box-shadow:none">
            <strong>{{ p.name }}</strong>
            <div class="muted">{{ money(p.price) }} за единицу</div>
          </div>
          <div class="field">
            <label for="qty">Количество</label>
            <input id="qty" type="number" min="1" class="input" formControlName="quantity" />
            @if (orderInvalid('quantity')) {
              <span class="field-error">Укажите количество (≥ 1)</span>
            }
          </div>
          <div class="field">
            <label>Итого</label>
            <div class="price">{{ money(total()) }}</div>
          </div>
          <button class="btn btn-primary btn-block" type="submit" [disabled]="orderSaving()">
            {{ orderSaving() ? 'Оформляем…' : 'Подтвердить заказ' }}
          </button>
        </form>
      }
    </app-drawer>

    <!-- Create/edit-product drawer (PRODUCT_CREATE_ROLES, edit only own) -->
    <app-drawer
      [open]="createOpen()"
      [title]="editingId() ? 'Изменить товар' : 'Новый товар'"
      (close)="createOpen.set(false)"
    >
      <form class="stack" [formGroup]="createForm" (ngSubmit)="submitCreate()">
        @if (createError()) {
          <div class="alert alert-error">{{ createError()!.message }}</div>
        }
        <div class="field">
          <label>Название</label>
          <input class="input" formControlName="name" />
          @if (createFieldError('name'); as msg) {
            <span class="field-error">{{ msg }}</span>
          } @else if (cInvalid('name')) {
            <span class="field-error">3–150 символов</span>
          }
        </div>
        <div class="field">
          <label>Описание</label>
          <textarea class="input" rows="4" formControlName="description"></textarea>
          @if (createFieldError('description'); as msg) {
            <span class="field-error">{{ msg }}</span>
          } @else if (cInvalid('description')) {
            <span class="field-error">До 2000 символов</span>
          }
        </div>
        <div class="field">
          <label>Цена, ₽</label>
          <input type="number" step="0.01" min="0.01" class="input" formControlName="price" />
          @if (createFieldError('price'); as msg) {
            <span class="field-error">{{ msg }}</span>
          } @else if (cInvalid('price')) {
            <span class="field-error">Минимум 0.01</span>
          }
        </div>
        <div class="field">
          <label>Категория</label>
          <select class="select" formControlName="category">
            @for (c of categories(); track c) {
              <option [value]="c">{{ catLabel(c) }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>Изображения</label>
          <input
            #fileInput
            type="file"
            hidden
            multiple
            accept="image/*"
            (change)="onFilesSelected($event)"
          />
          <button class="btn btn-secondary" type="button" (click)="fileInput.click()">
            Добавить изображения
          </button>
          @if (picked().length) {
            <div class="thumbs">
              @for (img of picked(); track img.url; let i = $index) {
                <div class="thumb">
                  <img [src]="img.url" alt="" />
                  <button class="thumb-x" type="button" (click)="removePicked(i)">✕</button>
                </div>
              }
            </div>
          }
        </div>
        <button class="btn btn-primary btn-block" type="submit" [disabled]="createSaving()">
          {{ createSaving() ? 'Сохраняем…' : 'Разместить' }}
        </button>
      </form>
    </app-drawer>
  `,
  styles: [
    `
      .catalog { display: grid; grid-template-columns: 260px 1fr; gap: 20px; margin-top: 20px; }
      .filters h4 { font-size: 0.95rem; }
      .filter-tree { list-style: none; padding: 0; margin: 8px 0 0; display: flex; flex-direction: column; gap: 4px; }
      .filter-item {
        width: 100%;
        text-align: left;
        background: none;
        border: 0;
        padding: 8px 10px;
        border-radius: var(--radius-sm);
        cursor: pointer;
        font: inherit;
        color: var(--gray-700);
      }
      .filter-item:hover { background: var(--gray-100); }
      .filter-item.active { background: var(--green-100); color: var(--green-700); font-weight: 600; }
      .results { display: flex; flex-direction: column; gap: 16px; }
      .product-card { display: grid; grid-template-columns: 96px 1fr 200px; gap: 18px; align-items: center; }
      .product-thumb {
        width: 96px; height: 96px; border-radius: var(--radius-sm);
        background: var(--green-100); display: grid; place-items: center; font-size: 2.4rem;
        overflow: hidden;
      }
      .product-thumb img { width: 100%; height: 100%; object-fit: cover; }
      .thumbs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
      .thumb { position: relative; width: 72px; height: 72px; }
      .thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius-sm); }
      .thumb-x { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; padding: 0; border: none; border-radius: 50%; background: var(--danger, #d33); color: #fff; font-size: 0.7rem; line-height: 1; cursor: pointer; }
      .product-title { margin: 6px 0 4px; }
      .product-desc { margin: 0 0 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .attrs { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 0.85rem; }
      .attr-label { color: var(--text-muted); margin-right: 4px; }
      .product-side { display: flex; flex-direction: column; gap: 8px; align-items: stretch; }
      .acts { display: flex; gap: 6px; justify-content: flex-end; }
      .badge-own { align-self: center; }
      .price { font-size: 1.3rem; font-weight: 700; color: var(--gray-900); text-align: right; }
      @media (max-width: 860px) {
        .catalog { grid-template-columns: 1fr; }
        .product-card { grid-template-columns: 1fr; }
        .price { text-align: left; }
      }
    `,
  ],
})
export class ProductsComponent {
  private products = inject(ProductService);
  private orders = inject(OrderService);
  private media = inject(MediaService);
  private chat = inject(ChatLauncherService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private fb = inject(FormBuilder);

  readonly createRoles = PRODUCT_CREATE_ROLES;

  private all = signal<ProductInfo[]>([]);
  loading = signal(true);
  error = signal<AppError | null>(null);
  category = signal<string | null>(null);
  categories = signal<string[]>(['SEEDS']);
  search = signal('');
  readonly catLabel = categoryLabel;

  orderTarget = signal<ProductInfo | null>(null);
  orderSaving = signal(false);
  orderError = signal<AppError | null>(null);

  orderForm = this.fb.nonNullable.group({
    quantity: [1, [Validators.required, Validators.min(1)]],
  });

  // create/edit-product
  createOpen = signal(false);
  editingId = signal<number | null>(null);
  createSaving = signal(false);
  createError = signal<AppError | null>(null);
  picked = signal<{ file: File; url: string }[]>([]);
  createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    description: ['', Validators.maxLength(2000)],
    price: [0.01, [Validators.required, Validators.min(0.01)]],
    category: ['SEEDS'],
  });

  readonly money = formatMoney;

  visible = computed(() => {
    const cat = this.category();
    const q = this.search().trim().toLowerCase();
    return this.all().filter(
      (p) =>
        (!cat || p.category === cat) &&
        (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)),
    );
  });

  total = computed(() => {
    const p = this.orderTarget();
    const qty = this.orderForm.controls.quantity.value || 0;
    return p ? p.price * qty : 0;
  });

  constructor() {
    this.reload();
    this.loadCategories();
  }

  private loadCategories(): void {
    this.products.categories().subscribe({
      next: (cats) => {
        if (cats.length) this.categories.set(cats);
      },
      error: () => {},
    });
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.products.list({ size: 50 }).subscribe({
      next: (items) => {
        this.all.set(items);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(appErrorOf(err, 'Не удалось загрузить товары'));
        this.loading.set(false);
      },
    });
  }

  setCategory(c: string | null): void {
    this.category.set(c);
  }

  // ---- create/edit product (PRODUCT_CREATE_ROLES; edit only own) ----
  canCreate(): boolean {
    const r = this.auth.role();
    return !!r && this.createRoles.includes(r);
  }

  canEdit(p: ProductInfo): boolean {
    return this.isOwn(p) && this.canCreate();
  }

  canDelete(p: ProductInfo): boolean {
    return this.isOwn(p) || this.auth.role() === 'ADMIN';
  }

  openCreate(): void {
    if (!this.canCreate()) return;
    this.editingId.set(null);
    this.createError.set(null);
    this.clearPicked();
    this.createForm.reset({
      name: '',
      description: '',
      price: 0.01,
      category: this.categories()[0] ?? 'SEEDS',
    });
    this.createOpen.set(true);
  }

  openEdit(p: ProductInfo): void {
    if (!this.canEdit(p)) return;
    this.editingId.set(p.id);
    this.createError.set(null);
    this.clearPicked();
    this.createForm.reset({
      name: p.name,
      description: p.description,
      price: p.price,
      category: p.category,
    });
    this.createOpen.set(true);
  }

  onFilesSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const added = Array.from(input.files ?? []).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    this.picked.update((p) => [...p, ...added]);
    input.value = '';
  }

  removePicked(i: number): void {
    this.picked.update((p) => {
      const item = p[i];
      if (item) URL.revokeObjectURL(item.url);
      return p.filter((_, idx) => idx !== i);
    });
  }

  private clearPicked(): void {
    for (const p of this.picked()) URL.revokeObjectURL(p.url);
    this.picked.set([]);
  }

  cInvalid(name: string): boolean {
    const c = this.createForm.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  createFieldError(name: string): string | null {
    return this.createError()?.fieldErrors?.[name] ?? null;
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.createSaving.set(true);
    this.createError.set(null);
    const v = this.createForm.getRawValue();
    const files = this.picked().map((p) => p.file);
    const editingId = this.editingId();
    const req$ = editingId
      ? this.products.update(editingId, { name: v.name, description: v.description, price: v.price })
      : this.products.create({
          name: v.name,
          description: v.description,
          price: v.price,
          category: v.category,
        });
    req$.subscribe({
      next: (list) => {
        const saved = list[0];
        const id = editingId ?? saved?.id;
        if (files.length && id != null) {
          this.media.upload('PRODUCT', id, files).subscribe({
            next: (media) => this.finishSave(editingId, saved, media),
            error: () => {
              this.finishSave(editingId, saved, []);
              this.toast.error('Не удалось загрузить файл');
            },
          });
        } else {
          this.finishSave(editingId, saved, []);
          if (files.length) this.toast.error('Не удалось загрузить файл');
        }
      },
      error: (err) => {
        this.createSaving.set(false);
        this.createError.set(
          appErrorOf(err, editingId ? 'Не удалось обновить товар' : 'Не удалось создать товар'),
        );
      },
    });
  }

  private finishSave(
    editingId: number | null,
    saved: ProductInfo | undefined,
    media: Media[],
  ): void {
    this.createSaving.set(false);
    this.createOpen.set(false);
    this.editingId.set(null);
    this.clearPicked();
    if (editingId != null && saved) {
      this.all.update((l) =>
        l.map((x) => (x.id === editingId ? { ...saved, media: media.length ? media : saved.media } : x)),
      );
      this.toast.success('Товар обновлён');
    } else if (saved) {
      this.all.update((l) => [{ ...saved, media: media.length ? media : saved.media }, ...l]);
      this.toast.success('Товар размещён');
    } else {
      this.reload();
      this.toast.success(editingId != null ? 'Товар обновлён' : 'Товар размещён');
    }
  }

  async remove(p: ProductInfo): Promise<void> {
    if (!this.canDelete(p)) return;
    const ok = await this.confirm.ask({
      title: 'Удалить товар?',
      message: `«${p.name}» будет удалён безвозвратно.`,
      confirmText: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    this.products.remove(p.id).subscribe({
      next: () => {
        this.all.update((l) => l.filter((x) => x.id !== p.id));
        this.toast.success('Товар удалён');
      },
      error: (err) => this.toast.error(appErrorOf(err, 'Не удалось удалить товар').message),
    });
  }

  onSearch(e: Event): void {
    this.search.set((e.target as HTMLInputElement).value);
  }

  isOwn(p: ProductInfo): boolean {
    const me = this.auth.userId();
    return me != null && String(me) === String(p.sellerInfoDto.sellerId);
  }

  contact(p: ProductInfo): void {
    if (this.isOwn(p)) return;
    const sellerId = Number(p.sellerInfoDto.sellerId);
    this.chat.open({
      sellerId,
      sellerName: p.sellerInfoDto.sellerName,
      title: `Чат с ${p.sellerInfoDto.sellerName}`,
      parties: [{ userId: sellerId, role: 'SELLER', name: p.sellerInfoDto.sellerName }],
    });
  }

  openOrder(p: ProductInfo): void {
    if (this.isOwn(p)) return;
    this.orderError.set(null);
    this.orderForm.reset({ quantity: 1 });
    this.orderTarget.set(p);
  }

  closeOrder(): void {
    this.orderTarget.set(null);
  }

  orderInvalid(name: string): boolean {
    const c = this.orderForm.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submitOrder(): void {
    const p = this.orderTarget();
    if (!p || this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }
    this.orderSaving.set(true);
    this.orderError.set(null);
    this.orders
      .create({
        sellerId: Number(p.sellerInfoDto.sellerId),
        productId: p.id,
        quantity: this.orderForm.controls.quantity.value,
        price: p.price,
      })
      .subscribe({
        next: () => {
          this.orderSaving.set(false);
          this.closeOrder();
          // Backend auto-creates a chat for the order; open it for the buyer.
          const sellerId = Number(p.sellerInfoDto.sellerId);
          this.chat.open({
            sellerId,
            title: 'Чат по заказу',
            parties: [{ userId: sellerId, role: 'SELLER', name: p.sellerInfoDto.sellerName }],
          });
        },
        error: (err) => {
          this.orderSaving.set(false);
          this.orderError.set(appErrorOf(err, 'Не удалось оформить заказ'));
        },
      });
  }
}
