import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { News } from '../core/models/news.models';
import { newsThumbUrl } from '../core/util/news-media';

@Component({
  selector: 'app-news-thumb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (url; as u) {
      <div class="news-thumb ratio-{{ ratio }}"><img [src]="u" [alt]="alt" /></div>
    } @else {
      <div class="news-thumb news-thumb-empty ratio-{{ ratio }}">📄</div>
    }
  `,
  styles: [
    `
      .news-thumb { background: var(--gray-100); border-radius: var(--radius-sm); display: grid; place-items: center; overflow: hidden; }
      .news-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .ratio-card { height: 120px; font-size: 2.4rem; margin-bottom: 10px; }
      .ratio-wide { aspect-ratio: 16 / 9; width: 100%; font-size: 3rem; }
      .ratio-mini { width: 84px; height: 60px; flex: none; font-size: 1.4rem; }
    `,
  ],
})
export class NewsThumbComponent {
  @Input({ required: true }) news!: News;
  @Input() alt = '';
  @Input() ratio: 'wide' | 'card' | 'mini' = 'card';

  get url(): string | null {
    return newsThumbUrl(this.news);
  }
}
