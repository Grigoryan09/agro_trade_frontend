import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BankingService } from '../../core/services/banking.service';
import {
  ContractDto,
  CreateBankingRequest,
  OfferDto,
} from '../../core/models/banking.models';
import { OfferType, TermUnit } from '../../core/models/enums';
import { AppError } from '../../core/models/api.models';
import { appErrorOf, formatMoney } from '../../core/util/format';
import { resolveMediaUrl } from '../../core/util/media-url';
import { DrawerComponent } from '../../shared/drawer.component';

@Component({
  selector: 'app-finance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DrawerComponent],
  template: `
    <div class="container">
      <h1>Кредиты и лизинг</h1>
      <p class="muted">Финансовые предложения банков-партнёров для агробизнеса</p>

      <div class="fin-layout">
        <!-- Params panel -->
        <aside class="params card">
          <h4>Тип финансирования</h4>
          <div class="toggle">
            <button class="t-btn" [class.active]="type() === null" (click)="setType(null)">Все</button>
            <button class="t-btn" [class.active]="type() === 'CREDIT'" (click)="setType('CREDIT')">
              Кредит
            </button>
            <button class="t-btn" [class.active]="type() === 'LEASING'" (click)="setType('LEASING')">
              Лизинг
            </button>
          </div>
          <h4 style="margin-top:18px">Сортировка</h4>
          <select class="select" [value]="sort()" (change)="setSort($event)">
            <option value="interestRate,asc">Ставка ↑</option>
            <option value="interestRate,desc">Ставка ↓</option>
          </select>
        </aside>

        <!-- Offers -->
        <section>
          @if (loadingOffers()) {
            @for (s of [1, 2, 3]; track s) {
              <div class="card" style="margin-bottom:14px"><div class="skeleton" style="height:120px"></div></div>
            }
          } @else if (offersError()) {
            <div class="state">
              <div class="state-icon">⚠️</div>
              <p>{{ offersError()!.message }}</p>
              <button class="btn btn-secondary" (click)="loadOffers()">Повторить</button>
            </div>
          } @else if (visibleOffers().length === 0) {
            <div class="state"><div class="state-icon">💳</div><p>Предложений нет</p></div>
          } @else {
            @for (o of visibleOffers(); track o.id) {
              <article class="card offer-card">
                <div class="offer-head">
                  <span class="badge badge-yellow">Выбор фермеров</span>
                  <h3>{{ o.bankDto.bankName }}</h3>
                  <span class="muted">{{ o.offerType === 'CREDIT' ? 'Кредит' : 'Лизинг' }}</span>
                </div>
                <div class="stats">
                  <div class="stat">
                    <div class="stat-label">Ставка</div>
                    <div class="stat-value">{{ o.interestRate }}%</div>
                  </div>
                  <div class="stat">
                    <div class="stat-label">Срок до</div>
                    <div class="stat-value">{{ o.maxDurationMonths }} мес.</div>
                  </div>
                  <div class="stat">
                    <div class="stat-label">Мин. сумма</div>
                    <div class="stat-value">{{ money(o.minAmount) }}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-label">Банк</div>
                    <div class="stat-value sm">{{ o.bankDto.phoneNumber }}</div>
                  </div>
                </div>
                <button class="btn btn-primary" (click)="openContract(o)">Рассчитать онлайн</button>
              </article>
            }
          }
        </section>
      </div>

      <!-- Contracts -->
      <h2 style="margin-top:32px">Мои заявки на финансирование</h2>
      @if (loadingContracts()) {
        <div class="card"><div class="skeleton" style="height:48px"></div></div>
      } @else if (contracts().length === 0) {
        <div class="state"><div class="state-icon">📄</div><p>Заявок пока нет</p></div>
      } @else {
        <div class="list">
          @for (c of contracts(); track c.id) {
            <article class="card contract-card">
              <div>
                <strong>Заявка №{{ c.id }}</strong>
                <span class="badge" [class]="isCompleted(c) ? 'badge-green' : 'badge-yellow'">
                  {{ isCompleted(c) ? 'Готов' : 'Формируется' }}
                </span>
              </div>
              <div class="muted">
                {{ money(c.approvedAmount) }} · {{ c.tenor }} {{ termLabel(c.tenorUnit) }}
                @if (c.offerType) { · {{ c.offerType === 'CREDIT' ? 'Кредит' : 'Лизинг' }} }
              </div>
              <div class="row" style="gap:8px">
                @if (docUrl(c); as href) {
                  <a class="btn btn-ghost btn-sm" [href]="href" target="_blank" rel="noopener" download>
                    Скачать договор
                  </a>
                } @else {
                  <button class="btn btn-ghost btn-sm" disabled>Договор формируется…</button>
                }
              </div>
            </article>
          }
        </div>
      }
    </div>

    <!-- Contract drawer -->
    <app-drawer [open]="!!offerTarget()" [title]="'Заявка на финансирование'" (close)="closeContract()">
      @if (offerTarget(); as o) {
        <form class="stack" [formGroup]="form" (ngSubmit)="submitContract()">
          @if (contractError()) {
            <div class="alert alert-error">{{ contractError()!.message }}</div>
          }
          <div class="card" style="box-shadow:none">
            <strong>{{ o.bankDto.bankName }}</strong>
            <div class="muted">Ставка {{ o.interestRate }}% · до {{ o.maxDurationMonths }} мес.</div>
          </div>
          <div class="field">
            <label for="amount">Сумма, ₽</label>
            <input id="amount" type="number" class="input" formControlName="approvedAmount" [min]="o.minAmount" />
            @if (invalid('approvedAmount')) {
              <span class="field-error">Сумма должна быть больше 0 (мин. {{ money(o.minAmount) }})</span>
            }
          </div>
          <div class="row" style="gap:12px">
            <div class="field" style="flex:1">
              <label for="tenor">Срок</label>
              <input id="tenor" type="number" min="1" class="input" formControlName="tenor" />
              @if (invalid('tenor')) { <span class="field-error">Минимум 1</span> }
            </div>
            <div class="field" style="flex:1">
              <label for="termUnit">Ед. срока</label>
              <select id="termUnit" class="select" formControlName="termUnit">
                <option value="MONTHS">Месяцы</option>
                <option value="YEARS">Годы</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label for="pname">Назначение (товар)</label>
            <input id="pname" class="input" formControlName="productName" placeholder="Напр. Семена пшеницы" />
            @if (invalid('productName')) { <span class="field-error">Укажите назначение</span> }
          </div>
          <div class="field">
            <label for="ptype">Тип товара</label>
            <input id="ptype" class="input" formControlName="productType" placeholder="Напр. SEEDS" />
            @if (invalid('productType')) { <span class="field-error">Укажите тип</span> }
          </div>
          <button class="btn btn-primary btn-block" type="submit" [disabled]="saving()">
            {{ saving() ? 'Отправляем…' : 'Подать заявку' }}
          </button>
        </form>
      }
    </app-drawer>
  `,
  styles: [
    `
      .fin-layout { display: grid; grid-template-columns: 240px 1fr; gap: 20px; margin-top: 20px; }
      .toggle { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
      .t-btn { border: 1px solid var(--border); background: #fff; padding: 8px; border-radius: var(--radius-sm); cursor: pointer; font: inherit; }
      .t-btn.active { background: var(--green-100); border-color: var(--green-300); color: var(--green-700); font-weight: 600; }
      .offer-card { background: linear-gradient(180deg, var(--green-50), #fff); margin-bottom: 14px; }
      .offer-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .offer-head h3 { margin: 0; }
      .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0; }
      .stat { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px; }
      .stat-label { font-size: 0.75rem; color: var(--text-muted); }
      .stat-value { font-weight: 700; font-size: 1.05rem; }
      .stat-value.sm { font-size: 0.85rem; font-weight: 600; }
      .list { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
      .contract-card { display: flex; flex-direction: column; gap: 6px; }
      .contract-card .badge { margin-left: 8px; }
      @media (max-width: 860px) { .fin-layout { grid-template-columns: 1fr; } .stats { grid-template-columns: repeat(2, 1fr); } }
    `,
  ],
})
export class FinanceComponent {
  private banking = inject(BankingService);
  private fb = inject(FormBuilder);

  private offers = signal<OfferDto[]>([]);
  loadingOffers = signal(true);
  offersError = signal<AppError | null>(null);
  type = signal<OfferType | null>(null);
  sort = signal('interestRate,asc');

  contracts = signal<ContractDto[]>([]);
  loadingContracts = signal(true);

  offerTarget = signal<OfferDto | null>(null);
  saving = signal(false);
  contractError = signal<AppError | null>(null);

  readonly money = formatMoney;

  form = this.fb.nonNullable.group({
    approvedAmount: [0, [Validators.required, Validators.min(0.01)]],
    tenor: [12, [Validators.required, Validators.min(1)]],
    termUnit: ['MONTHS' as TermUnit, Validators.required],
    productName: ['', Validators.required],
    productType: ['', Validators.required],
  });

  visibleOffers = computed(() => {
    const t = this.type();
    return this.offers().filter((o) => !t || o.offerType === t);
  });

  constructor() {
    this.loadOffers();
    this.loadContracts();
  }

  loadOffers(): void {
    this.loadingOffers.set(true);
    this.offersError.set(null);
    this.banking.listOffers({ size: 50, sort: this.sort() }).subscribe({
      next: (items) => {
        this.offers.set(items);
        this.loadingOffers.set(false);
      },
      error: (err) => {
        this.offersError.set(appErrorOf(err, 'Не удалось загрузить предложения'));
        this.loadingOffers.set(false);
      },
    });
  }

  loadContracts(): void {
    this.loadingContracts.set(true);
    this.banking.listContracts({ size: 50 }).subscribe({
      next: (items) => {
        this.contracts.set(items);
        this.loadingContracts.set(false);
      },
      error: () => {
        // Banking returns 400 for "not found" — treat as empty list.
        this.contracts.set([]);
        this.loadingContracts.set(false);
      },
    });
  }

  setType(t: OfferType | null): void {
    this.type.set(t);
  }
  setSort(e: Event): void {
    this.sort.set((e.target as HTMLSelectElement).value);
    this.loadOffers();
  }
  termLabel(u: TermUnit | undefined): string {
    return u === 'YEARS' ? 'г.' : 'мес.';
  }

  openContract(o: OfferDto): void {
    this.contractError.set(null);
    this.form.reset({
      approvedAmount: o.minAmount,
      tenor: Math.min(12, o.maxDurationMonths),
      termUnit: 'MONTHS',
      productName: '',
      productType: '',
    });
    this.offerTarget.set(o);
  }
  closeContract(): void {
    this.offerTarget.set(null);
  }
  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  submitContract(): void {
    const o = this.offerTarget();
    if (!o || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.contractError.set(null);
    const v = this.form.getRawValue();
    const body: CreateBankingRequest = {
      bankingRequestType: o.offerType,
      offerId: o.id,
      approvedAmount: v.approvedAmount,
      tenor: v.tenor,
      termUnit: v.termUnit,
      productName: v.productName,
      productType: v.productType,
    };
    this.banking.createBankingRequest(body).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeContract();
        this.loadContracts();
      },
      error: (err) => {
        this.saving.set(false);
        this.contractError.set(appErrorOf(err, 'Не удалось подать заявку'));
      },
    });
  }

  docUrl(c: ContractDto): string | null {
    return resolveMediaUrl(c.documentUrl);
  }

  isCompleted(c: ContractDto): boolean {
    return c.documentStatus === 'COMPLETED' || !!c.documentUrl;
  }
}
