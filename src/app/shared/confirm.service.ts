import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/**
 * Promise-based confirm dialog. Render <app-confirm-host /> once in the shell.
 *   if (await confirm.ask({ title, message, danger: true })) { … }
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly current = signal<ConfirmRequest | null>(null);

  ask(opts: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.current.set({ ...opts, resolve });
    });
  }

  answer(ok: boolean): void {
    const req = this.current();
    if (req) {
      req.resolve(ok);
      this.current.set(null);
    }
  }
}