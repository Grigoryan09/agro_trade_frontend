import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NewsService } from '../../core/services/news.service';
import { MediaService } from '../../core/services/media.service';
import { News, CreateNewsRequest } from '../../core/models/news.models';
import { Media } from '../../core/models/media.models';
import { AppError } from '../../core/models/api.models';
import { NEWS_WRITE_ROLES } from '../../core/models/enums';
import { appErrorOf, formatDate } from '../../core/util/format';
import { newsThumbUrl } from '../../core/util/news-media';
import { DrawerComponent } from '../../shared/drawer.component';
import { NewsThumbComponent } from '../../shared/news-thumb.component';
import { ToastService } from '../../shared/toast.service';
import { ConfirmService } from '../../shared/confirm.service';
import { HasRoleDirective } from '../../core/directives/has-role.directive';

@Component({
  selector: 'app-news',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DrawerComponent, HasRoleDirective, NewsThumbComponent],
  template: `
    <div class="container">
      <div class="row">
        <h1>Журнал</h1>
        <span class="spacer"></span>
        <button class="btn btn-primary" *appHasRole="writeRoles" (click)="openEditor(null)">
          + Новость
        </button>
      </div>
      <input class="input" style="max-width:360px" placeholder="Поиск по статьям…" (input)="onSearch($event)" />

      @if (loading()) {
        <div class="grid grid-auto" style="margin-top:20px">
          @for (s of [1, 2, 3, 4, 5, 6]; track s) {
            <div class="card"><div class="skeleton" style="height:160px"></div></div>
          }
        </div>
      } @else if (error()) {
        <div class="state">
          <div class="state-icon">⚠️</div>
          <p>{{ error()!.message }}</p>
          <button class="btn btn-secondary" (click)="reload()">Повторить</button>
        </div>
      } @else if (visible().length === 0) {
        <div class="state"><div class="state-icon">📰</div><p>Статей не найдено</p></div>
      } @else {
        @if (featured(); as f) {
          <article class="featured" (click)="open(f)">
            <div class="featured-media">
              @if (heroUrl(f); as u) {
                <img [src]="u" [alt]="f.title" />
              } @else {
                <div class="featured-empty">📰</div>
              }
            </div>
            <span class="featured-acts" *appHasRole="writeRoles" [title]="f.id ? '' : idHint">
              <button class="btn btn-secondary btn-sm" [disabled]="!f.id" (click)="edit($event, f)">✎</button>
              <button class="btn btn-danger btn-sm" [disabled]="!f.id" (click)="remove($event, f)">🗑</button>
            </span>
            <div class="featured-overlay">
              <h2>{{ f.title }}</h2>
            </div>
          </article>
        }
        <div class="grid news-grid" style="margin-top:20px">
          @for (n of rest(); track n.id) {
            <article class="card article" (click)="open(n)">
              <app-news-thumb [news]="n" ratio="wide" [alt]="n.title" />
              <h3>{{ n.title }}</h3>
              <p class="muted">{{ preview(n.context) }}</p>
              <div class="card-foot">
                <span class="date">{{ date(n.createdAt) }}</span>
                <span class="spacer"></span>
                <span class="acts" *appHasRole="writeRoles" [title]="n.id ? '' : idHint">
                  <button class="btn btn-secondary btn-sm" [disabled]="!n.id" (click)="edit($event, n)">✎</button>
                  <button class="btn btn-danger btn-sm" [disabled]="!n.id" (click)="remove($event, n)">🗑</button>
                </span>
              </div>
            </article>
          }
        </div>
      }
    </div>

    <!-- Editor drawer (create / edit) -->
    <app-drawer
      [open]="editorOpen()"
      [title]="editing() ? 'Изменить новость' : 'Новая новость'"
      (close)="editorOpen.set(false)"
    >
      <form class="stack" [formGroup]="form" (ngSubmit)="save()">
        @if (formError()) {
          <div class="alert alert-error">{{ formError()!.message }}</div>
        }
        <div class="field">
          <label>Заголовок</label>
          <input class="input" formControlName="title" />
          @if (fieldError('title'); as msg) {
            <span class="field-error">{{ msg }}</span>
          } @else if (fInvalid('title')) {
            <span class="field-error">3–255 символов</span>
          }
        </div>
        <div class="field">
          <label>Текст</label>
          <textarea class="input" rows="8" formControlName="context"></textarea>
          @if (fieldError('context'); as msg) {
            <span class="field-error">{{ msg }}</span>
          } @else if (fInvalid('context')) {
            <span class="field-error">10–5000 символов</span>
          }
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
              @for (p of picked(); track p.url; let i = $index) {
                <div class="thumb">
                  <img [src]="p.url" alt="" />
                  <button class="thumb-x" type="button" (click)="removePicked(i)">✕</button>
                </div>
              }
            </div>
          }
        </div>
        <button class="btn btn-primary btn-block" type="submit" [disabled]="saving()">
          {{ saving() ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </form>
    </app-drawer>
  `,
  styles: [
    `
      .featured { position: relative; margin-top: 20px; cursor: pointer; border-radius: var(--radius); overflow: hidden; background: #0f1512; display: block; }
      .featured-media { width: 100%; aspect-ratio: 16 / 9; max-height: 70vh; }
      .featured-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .featured-empty { width: 100%; height: 100%; display: grid; place-items: center; font-size: 3.5rem; }
      .featured-overlay { position: absolute; left: 0; right: 0; bottom: 0; padding: 64px 28px 24px; background: linear-gradient(to top, rgba(0, 0, 0, 0.78), rgba(0, 0, 0, 0.4) 45%, rgba(0, 0, 0, 0)); pointer-events: none; }
      .featured-overlay h2 { margin: 0; color: #fff; font-size: 2rem; line-height: 1.15; max-width: 22ch; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5); }
      .featured-acts { position: absolute; top: 14px; right: 14px; display: flex; gap: 6px; z-index: 2; }
      @media (max-width: 720px) {
        .featured-overlay { padding: 48px 16px 16px; }
        .featured-overlay h2 { font-size: 1.35rem; }
      }
      .news-grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
      .article { cursor: pointer; display: flex; flex-direction: column; }
      .thumbs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
      .thumb { position: relative; width: 72px; height: 72px; }
      .thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius-sm); }
      .thumb-x { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; padding: 0; border: none; border-radius: 50%; background: var(--danger, #d33); color: #fff; font-size: 0.7rem; line-height: 1; cursor: pointer; }
      .article h3 { margin: 0 0 6px; font-size: 1.2rem; }
      .article p { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      .date { color: var(--text-muted); font-size: 0.8rem; }
      .card-foot { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
      .acts { display: flex; gap: 6px; }
    `,
  ],
})
export class NewsComponent {
  private news = inject(NewsService);
  private media = inject(MediaService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  private all = signal<News[]>([]);
  loading = signal(true);
  error = signal<AppError | null>(null);
  search = signal('');

  // editor
  editorOpen = signal(false);
  editing = signal<News | null>(null);
  saving = signal(false);
  formError = signal<AppError | null>(null);
  picked = signal<{ file: File; url: string }[]>([]);
  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
    context: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
  });

  readonly date = formatDate;
  readonly writeRoles = NEWS_WRITE_ROLES;
  // Edit/delete need an id the news response DTO doesn't return yet (CONTRACT-GAPS #13).
  readonly idHint = 'Недоступно: сервер не возвращает id новости (CONTRACT-GAPS #13)';

  visible = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.all().filter((n) => !q || n.title.toLowerCase().includes(q));
  });
  featured = computed(() => this.visible()[0] ?? null);
  rest = computed(() => this.visible().slice(1));

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.news.list({ size: 50 }).subscribe({
      next: (items) => {
        this.all.set(items);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(appErrorOf(err, 'Не удалось загрузить статьи'));
        this.loading.set(false);
      },
    });
  }

  onSearch(e: Event): void {
    this.search.set((e.target as HTMLInputElement).value);
  }
  preview(text: string): string {
    return text.length > 160 ? text.slice(0, 160) + '…' : text;
  }
  heroUrl(n: News): string | null {
    return newsThumbUrl(n);
  }
  open(n: News): void {
    if (n.id != null) this.router.navigate(['/news', n.id]);
  }

  // ---- editor (NEWS_WRITE_ROLES only) ----
  fInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
  fieldError(name: string): string | null {
    return this.formError()?.fieldErrors?.[name] ?? null;
  }

  openEditor(n: News | null): void {
    this.editing.set(n);
    this.formError.set(null);
    this.clearPicked();
    this.form.reset({ title: n?.title ?? '', context: n?.context ?? '' });
    this.editorOpen.set(true);
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

  edit(e: Event, n: News): void {
    e.stopPropagation();
    this.openEditor(n);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    const body: CreateNewsRequest = this.form.getRawValue();
    const editing = this.editing();
    const files = this.picked().map((p) => p.file);
    const req$ = editing ? this.news.update(editing.id, body) : this.news.create(body);
    req$.subscribe({
      next: (list) => {
        const saved = list[0];
        const id = editing ? editing.id : saved?.id;
        if (files.length && id != null) {
          this.media.upload('NEWS', id, files).subscribe({
            next: (media) => this.finishSave(editing, saved, body, media),
            error: () => {
              this.finishSave(editing, saved, body, []);
              this.toast.error('Не удалось загрузить файл');
            },
          });
        } else {
          this.finishSave(editing, saved, body, []);
          if (files.length) this.toast.error('Не удалось загрузить файл');
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(appErrorOf(err, 'Не удалось сохранить новость'));
      },
    });
  }

  private finishSave(
    editing: News | null,
    saved: News | undefined,
    body: CreateNewsRequest,
    media: Media[],
  ): void {
    this.saving.set(false);
    this.editorOpen.set(false);
    this.clearPicked();
    if (editing) {
      this.all.update((l) =>
        l.map((x) =>
          x.id === editing.id ? { ...x, ...body, media: media.length ? media : x.media } : x,
        ),
      );
      this.toast.success('Новость обновлена');
    } else if (saved) {
      this.all.update((l) => [{ ...saved, media: media.length ? media : saved.media }, ...l]);
      this.toast.success('Новость создана');
    } else {
      this.reload();
      this.toast.success('Новость создана');
    }
  }

  async remove(e: Event, n: News): Promise<void> {
    e.stopPropagation();
    const ok = await this.confirm.ask({
      title: 'Удалить новость?',
      message: `«${n.title}» будет удалена безвозвратно.`,
      confirmText: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    this.news.remove(n.id).subscribe({
      next: () => {
        this.all.update((l) => l.filter((x) => x.id !== n.id));
        this.toast.success('Новость удалена');
      },
      error: (err) => this.toast.error(appErrorOf(err, 'Не удалось удалить').message),
    });
  }
}
