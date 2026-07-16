import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NewsService } from '../../core/services/news.service';
import { News } from '../../core/models/news.models';
import { AppError } from '../../core/models/api.models';
import { appErrorOf, formatDate } from '../../core/util/format';
import { newsImageUrls } from '../../core/util/news-media';
import { NewsThumbComponent } from '../../shared/news-thumb.component';

@Component({
  selector: 'app-news-article',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NewsThumbComponent],
  template: `
    <div class="container">
      <a class="btn btn-ghost btn-sm back" routerLink="/news">← В журнал</a>

      @if (loading()) {
        <div class="skeleton" style="height:360px;margin-top:16px"></div>
      } @else if (error()) {
        <div class="state">
          <div class="state-icon">⚠️</div>
          <p>{{ error()!.message }}</p>
          <a class="btn btn-secondary" routerLink="/news">К списку</a>
        </div>
      } @else if (article(); as a) {
        <div class="layout">
          <article class="main">
            <h1 class="title">{{ a.title }}</h1>
            <span class="date">{{ date(a.createdAt) }}</span>
            @if (hero(); as h) {
              <div class="hero"><img [src]="h" [alt]="a.title" /></div>
            }
            <div class="body">{{ a.context }}</div>
            @if (gallery().length) {
              <div class="gallery">
                @for (u of gallery(); track u) {
                  <img [src]="u" [alt]="a.title" />
                }
              </div>
            }
          </article>

          <aside class="sidebar">
            <h3>Другие новости</h3>
            @if (others().length === 0) {
              <p class="muted">Больше статей пока нет</p>
            } @else {
              @for (o of others(); track o.id) {
                <a class="side-item" [routerLink]="['/news', o.id]">
                  <app-news-thumb [news]="o" ratio="mini" [alt]="o.title" />
                  <div class="side-text">
                    <strong>{{ o.title }}</strong>
                    <span class="date">{{ date(o.createdAt) }}</span>
                  </div>
                </a>
              }
            }
          </aside>
        </div>
      } @else {
        <div class="state"><div class="state-icon">📰</div><p>Статья не найдена</p></div>
      }
    </div>
  `,
  styles: [
    `
      .back { margin-top: 8px; }
      .layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 32px; margin-top: 16px; align-items: start; }
      .main { min-width: 0; }
      .title { font-size: 2.4rem; line-height: 1.15; margin: 0 0 8px; }
      .date { color: var(--text-muted); font-size: 0.85rem; }
      .hero { margin: 20px 0; border-radius: var(--radius); overflow: hidden; aspect-ratio: 16 / 9; background: var(--gray-100); }
      .hero img { width: 100%; height: 100%; object-fit: cover; }
      .body { white-space: pre-wrap; line-height: 1.75; font-size: 1.05rem; }
      .gallery { display: flex; flex-direction: column; gap: 16px; margin-top: 24px; }
      .gallery img { width: 100%; border-radius: var(--radius-sm); }
      .sidebar { position: sticky; top: 16px; display: flex; flex-direction: column; gap: 14px; }
      .sidebar h3 { margin: 0 0 4px; }
      .side-item { display: flex; gap: 12px; align-items: center; }
      .side-item:hover { text-decoration: none; }
      .side-item:hover strong { color: var(--green-600, #2e7d32); }
      .side-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
      .side-text strong { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      @media (max-width: 900px) {
        .layout { grid-template-columns: 1fr; }
        .sidebar { position: static; }
      }
    `,
  ],
})
export class ArticleComponent {
  private route = inject(ActivatedRoute);
  private news = inject(NewsService);

  loading = signal(true);
  error = signal<AppError | null>(null);
  article = signal<News | null>(null);
  private all = signal<News[]>([]);

  readonly date = formatDate;

  hero = computed(() => newsImageUrls(this.article() ?? ({} as News))[0] ?? null);
  gallery = computed(() => newsImageUrls(this.article() ?? ({} as News)).slice(1));
  others = computed(() => {
    const id = this.article()?.id;
    return this.all()
      .filter((n) => n.id !== id)
      .slice(0, 6);
  });

  constructor() {
    this.news.list({ size: 50 }).subscribe({
      next: (items) => this.all.set(items),
      error: () => this.all.set([]),
    });

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = Number(params.get('id'));
      this.loadArticle(id);
    });
  }

  private loadArticle(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.article.set(null);
    if (!Number.isFinite(id)) {
      this.loading.set(false);
      return;
    }
    this.news.byId(id).subscribe({
      next: (item) => {
        this.article.set(item ?? null);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(appErrorOf(err, 'Не удалось загрузить статью'));
        this.loading.set(false);
      },
    });
  }
}
