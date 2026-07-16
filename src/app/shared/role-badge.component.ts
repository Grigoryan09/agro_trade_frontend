import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Role, ROLE_BADGE_CLASS } from '../core/models/enums';

/**
 * Color-coded badge for a user role. The role comes from the caller (the single
 * source is `AuthService.role()`), and the color is resolved from
 * `ROLE_BADGE_CLASS`. Renders nothing when the role is unknown — no hardcoded
 * fallback role.
 */
@Component({
  selector: 'app-role-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (role(); as r) {
      <span [class]="'badge ' + colorClass()">{{ r }}</span>
    }
  `,
})
export class RoleBadgeComponent {
  readonly role = input.required<Role | null>();
  readonly colorClass = computed(() => {
    const r = this.role();
    return r ? ROLE_BADGE_CLASS[r] : '';
  });
}