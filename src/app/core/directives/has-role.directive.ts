import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/enums';

/**
 * Structural directive: render content only when the current user's role is in
 * the given list. UI-only gating — real enforcement is on the backend.
 *
 *   <button *appHasRole="NEWS_WRITE_ROLES">…</button>
 */
@Directive({
  selector: '[appHasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private auth = inject(AuthService);

  readonly appHasRole = input.required<Role[]>();

  constructor() {
    effect(() => {
      const allowed = this.appHasRole();
      const role = this.auth.role();
      const ok = !!role && allowed.includes(role);
      this.vcr.clear();
      if (ok) this.vcr.createEmbeddedView(this.tpl);
    });
  }
}