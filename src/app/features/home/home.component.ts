import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { NewsService } from '../../core/services/news.service';
import { ProductInfo } from '../../core/models/product.models';
import { News } from '../../core/models/news.models';
import { formatMoney } from '../../core/util/format';
import { firstMediaUrl } from '../../core/util/media-url';
import { NewsThumbComponent } from '../../shared/news-thumb.component';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NewsThumbComponent],
  template: `
    <div class="container">
      <!-- Hero -->
      <section class="hero">
        <div class="hero-left">
          <h1 class="hero-title">Крупнейшая платформа для агробизнеса</h1>
          <ul class="features">
            <li><span class="f-icon">🌾</span> Каталог семян и продукции от проверенных продавцов</li>
            <li><span class="f-icon">💳</span> Кредиты и лизинг для сделок за 7 дней</li>
            <li><span class="f-icon">📄</span> Договоры и документы формируются автоматически</li>
          </ul>
          <div class="row" style="gap:12px">
            <a class="btn btn-primary" routerLink="/products">Перейти в каталог</a>
            <a class="btn btn-secondary" routerLink="/finance">Финансирование</a>
          </div>
        </div>
        <div class="hero-card card">
          <h3>Начните прямо сейчас</h3>
          <p class="muted">Подберите товар, оформите заказ и получите финансирование в одном месте.</p>
          <a class="btn btn-primary btn-block" routerLink="/orders">Мои заявки</a>
        </div>
      </section>

      <!-- Products preview -->
      <div class="row" style="margin-top:32px">
        <h2>Популярные товары</h2>
        <span class="spacer"></span>
        <a routerLink="/products">Все товары →</a>
      </div>
      @if (loadingProducts()) {
        <div class="grid grid-auto">
          @for (s of [1, 2, 3]; track s) { <div class="card"><div class="skeleton" style="height:120px"></div></div> }
        </div>
      } @else if (products().length === 0) {
        <div class="state"><div class="state-icon">🌱</div><p>Товары появятся скоро</p></div>
      } @else {
        <div class="grid grid-auto">
          @for (p of products(); track p.id) {
            <a class="card prod" routerLink="/products">
              @if (thumb(p); as img) {
                <div class="prod-thumb"><img [src]="img" [alt]="p.name" /></div>
              } @else {
                <div class="prod-thumb prod-thumb-empty">🌾</div>
              }
              <strong>{{ p.name }}</strong>
              <div class="price">{{ money(p.price) }}</div>
            </a>
          }
        </div>
      }

      <!-- News preview -->
      @if (news().length > 0) {
        <div class="row" style="margin-top:32px">
          <h2>Из журнала</h2>
          <span class="spacer"></span>
          <a routerLink="/news">Все статьи →</a>
        </div>
        <div class="grid grid-auto">
          @for (n of news(); track n.id) {
            <a class="card" routerLink="/news">
              <app-news-thumb [news]="n" [alt]="n.title" />
              <strong>{{ n.title }}</strong>
              <p class="muted">{{ preview(n.context) }}</p>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .hero { display: grid; grid-template-columns: 1fr 340px; gap: 24px; margin-top: 24px; background: linear-gradient(120deg, #fbf7ee, var(--green-50)); border-radius: 20px; padding: 36px; }
      .hero-title { font-size: 2.1rem; max-width: 14ch; }
      .features { list-style: none; padding: 0; margin: 20px 0; display: flex; flex-direction: column; gap: 12px; }
      .features li { display: flex; align-items: center; gap: 12px; }
      .f-icon { background: var(--yellow-100); width: 36px; height: 36px; border-radius: 9px; display: grid; place-items: center; font-size: 1.1rem; }
      .hero-card { align-self: center; }
      .prod { display: flex; flex-direction: column; gap: 8px; }
      .prod:hover { text-decoration: none; }
      .prod-thumb { height: 96px; background: var(--green-100); border-radius: var(--radius-sm); display: grid; place-items: center; font-size: 2.2rem; overflow: hidden; }
      .prod-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .price { font-weight: 700; }
      @media (max-width: 800px) { .hero { grid-template-columns: 1fr; } }
    `,
  ],
})
export class HomeComponent {
  private productSvc = inject(ProductService);
  private newsSvc = inject(NewsService);

  products = signal<ProductInfo[]>([]);
  news = signal<News[]>([]);
  loadingProducts = signal(true);

  readonly money = formatMoney;

  constructor() {
    this.productSvc.list({ size: 6 }).subscribe({
      next: (items) => {
        this.products.set(items.slice(0, 6));
        this.loadingProducts.set(false);
      },
      error: () => this.loadingProducts.set(false),
    });
    this.newsSvc.list({ size: 3 }).subscribe({
      next: (items) => this.news.set(items.slice(0, 3)),
      error: () => this.news.set([]),
    });
  }

  thumb(p: ProductInfo): string | null {
    return firstMediaUrl(p.media);
  }

  preview(t: string): string {
    return t.length > 120 ? t.slice(0, 120) + '…' : t;
  }
}
