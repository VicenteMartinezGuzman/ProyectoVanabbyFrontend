import { Component, ElementRef, OnDestroy, ViewEncapsulation, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { BootstrapCssService } from '../../core/bootstrap-css.service';

type Vista = 'control' | 'nuevo' | 'exito' | 'corte' | 'cerrada';
type EstadoPago = 'pagado' | 'pendiente' | 'cancelado';
type MetodoPago = 'tarjeta' | 'efectivo' | 'transferencia';

interface Pago {
  pedido: string;
  cliente: string;
  fecha: string;
  metodo: string;
  monto: string;
  estado: EstadoPago;
}

const ETIQUETA_ESTADO: Record<EstadoPago, string> = { pagado: 'Pagado', pendiente: 'Pendiente', cancelado: 'Cancelado' };
const METODOS: Record<MetodoPago, string> = { tarjeta: 'Tarjeta', efectivo: 'Efectivo', transferencia: 'Transferencia' };

@Component({
  selector: 'app-pagos',
  imports: [FormsModule, RouterLink],
  templateUrl: './pagos.page.html',
  styleUrl: './pagos.page.css',
  encapsulation: ViewEncapsulation.None,
})
export class PagosPage implements OnDestroy {
  private bs = inject(BootstrapCssService);
  private router = inject(Router);

  readonly efectivoEsperado = 16100;
  private readonly formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

  // Fecha actual
  private readonly hoy = new Date();
  readonly fechaISO = [
    this.hoy.getFullYear(),
    String(this.hoy.getMonth() + 1).padStart(2, '0'),
    String(this.hoy.getDate()).padStart(2, '0'),
  ].join('-');
  readonly fechaTexto = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(this.hoy);

  // Datos de ejemplo
  readonly pagos: Pago[] = [
    { pedido: '#PB-0012', cliente: 'Ana García', fecha: '20 oct 2026, 14:30', metodo: 'Tarjeta', monto: '$4,200.00 MXN', estado: 'pagado' },
    { pedido: '#PB-0012', cliente: 'Alba Salcedo', fecha: '20 oct 2026, 14:30', metodo: 'Efectivo', monto: '$1,500.00 MXN', estado: 'pendiente' },
    { pedido: '#PB-0013', cliente: 'Marta Gutiérrez', fecha: '20 oct 2026, 14:30', metodo: 'Efectivo', monto: '$3,800.00 MXN', estado: 'cancelado' },
    { pedido: '#PB-0013', cliente: 'Alarta Saliliez', fecha: '20 oct 2026, 14:30', metodo: 'Transferencia', monto: '$3,800.00 MXN', estado: 'pagado' },
    { pedido: '#PB-0012', cliente: 'Ana García', fecha: '20 oct 2026, 14:30', metodo: 'Transferencia', monto: '$3,800.00 MXN', estado: 'cancelado' },
  ];
  readonly etiquetaEstado = ETIQUETA_ESTADO;

  // Navegación entre vistas
  vista = signal<Vista>('control');

  // Búsqueda y filtros
  busqueda = signal('');
  filtro = signal<'todos' | EstadoPago>('todos');
  pagosFiltrados = computed(() => {
    const q = this.normalizar(this.busqueda());
    const estado = this.filtro();
    return this.pagos.filter((p) => {
      const info = this.normalizar(`${p.pedido} ${p.cliente} ${p.fecha} ${p.metodo} ${p.monto} ● ${ETIQUETA_ESTADO[p.estado]}`);
      return info.includes(q) && (estado === 'todos' || p.estado === estado);
    });
  });

  // Formulario de pago
  metodoPago: MetodoPago = 'tarjeta';
  requiereFactura = true;
  rfc = 'GAAA780101XY3';
  metodoConfirmado = signal('Tarjeta');
  rfcConfirmado = signal('GAAA780101XY3');

  // Corte de caja
  conteoReal = signal<number | null>(16100);
  diferencia = computed(() => Math.round(((Number(this.conteoReal()) || 0) - this.efectivoEsperado) * 100) / 100);
  diferenciaTexto = computed(() => `${this.formatoMoneda.format(this.diferencia())} MXN`);
  claseDiferencia = computed(() => 'badge ' + (this.diferencia() === 0 ? 'estado-pagado' : 'estado-cancelado'));

  // Modales de Bootstrap
  private mExportar = viewChild.required<ElementRef<HTMLElement>>('mExportar');
  private mFactura = viewChild.required<ElementRef<HTMLElement>>('mFactura');
  private mTicket = viewChild.required<ElementRef<HTMLElement>>('mTicket');
  private mReporte = viewChild.required<ElementRef<HTMLElement>>('mReporte');

  constructor() { this.bs.enable(); }
  ngOnDestroy() { this.bs.disable(); }

  private normalizar(texto: string) {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  ir(v: Vista) {
    this.vista.set(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  abrir(m: 'exportar' | 'factura' | 'ticket' | 'reporte') {
    const el = { exportar: this.mExportar, factura: this.mFactura, ticket: this.mTicket, reporte: this.mReporte }[m]().nativeElement;
    Modal.getOrCreateInstance(el).show();
  }
  cerrar(el: HTMLElement) { Modal.getInstance(el)?.hide(); }

  confirmarPago() {
    this.metodoConfirmado.set(METODOS[this.metodoPago]);
    this.rfcConfirmado.set(this.rfc.trim() || 'No especificado');
    this.ir('exito');
  }

  cerrarSesion() { if (confirm('¿Deseas cerrar sesión?')) this.router.navigate(['/login']); }
}
