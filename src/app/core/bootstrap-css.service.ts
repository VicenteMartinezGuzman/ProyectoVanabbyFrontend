import { Injectable } from '@angular/core';

/**
 * Algunas pantallas originales usan Bootstrap 5 y otras (pedidos, compras, monitoreo)
 * usan solo base.css. Para no mezclar ambos sistemas de estilo, la hoja de Bootstrap
 * está en index.html desactivada y cada página la enciende/apaga con este servicio.
 */
@Injectable({ providedIn: 'root' })
export class BootstrapCssService {
  private get link(): HTMLLinkElement | null {
    return document.getElementById('bootstrap-css') as HTMLLinkElement | null;
  }
  enable() { const l = this.link; if (l) l.disabled = false; }
  disable() { const l = this.link; if (l) l.disabled = true; }
}
