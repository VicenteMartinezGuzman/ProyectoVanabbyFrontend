import { Injectable } from '@angular/core';

/** Equivalente de common.js (objeto global `Vanabby`) como servicio inyectable. */
@Injectable({ providedIn: 'root' })
export class VanabbyService {
  readonly meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  guardar(k: string, v: unknown): void {
    try { localStorage.setItem('vanabby:' + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ }
  }

  cargar<T>(k: string, def: T): T {
    try {
      const v = localStorage.getItem('vanabby:' + k);
      return v ? (JSON.parse(v) as T) : def;
    } catch { return def; }
  }

  fechaCorta(d: Date = new Date()): string {
    return `${d.getDate()} ${this.meses[d.getMonth()]} ${d.getFullYear()}`;
  }

  moneda(n: number | string): string {
    return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** Toast ligero (mismo markup/clases que common.js: #toasts > .toast.<tipo>) */
  toast(mensaje: string, tipo = ''): void {
    let cont = document.getElementById('toasts');
    if (!cont) {
      cont = document.createElement('div');
      cont.id = 'toasts';
      document.body.appendChild(cont);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + tipo;
    t.textContent = mensaje;
    cont.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  /** QR ilustrativo (no funcional) generado con una semilla. Devuelve markup SVG. */
  qr(semilla = 'VANABBY', tam = 21): string {
    let s = 0;
    for (const c of semilla) s = (s * 31 + c.charCodeAt(0)) >>> 0;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const px = 4;
    let rects = '';
    const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= tam - 7 && y < 7) || (x < 7 && y >= tam - 7);
    for (let y = 0; y < tam; y++) {
      for (let x = 0; x < tam; x++) {
        let on: boolean;
        if (finder(x, y)) {
          const bx = x >= tam - 7 ? x - (tam - 7) : x;
          const by = y >= tam - 7 ? y - (tam - 7) : y;
          on = bx === 0 || bx === 6 || by === 0 || by === 6 || (bx >= 2 && bx <= 4 && by >= 2 && by <= 4);
        } else on = rnd() > 0.5;
        if (on) rects += `<rect x="${x * px}" y="${y * px}" width="${px}" height="${px}"/>`;
      }
    }
    const t = tam * px;
    return `<svg viewBox="0 0 ${t} ${t}" width="96" height="96" fill="#111" shape-rendering="crispEdges">${rects}</svg>`;
  }
}
