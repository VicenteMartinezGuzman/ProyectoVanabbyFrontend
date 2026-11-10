import { Component, HostListener, OnDestroy, OnInit, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VanabbyService } from '../../core/vanabby.service';
import { FechaCortaPipe } from '../../core/fecha-actual.pipe';

type Periodo = 'hoy' | 'semana' | 'mes';
type PeriodoTab = Periodo | 'custom';
type VistaId = 'v-hub' | 'v-pedidos' | 'v-almacen' | 'v-clientes' | 'v-auditoria' | 'v-consumo' | 'v-cliente-detalle' | 'v-seguimiento' | 'v-inspeccion';

interface KpiPedidos { pend: number; prep: number; ruta: number; inc: number; efi: number; entreg: number; cancel: number; retraso: number; prom: string; }
interface Tracking { folio: string; cliente: string; hora: string; estado: string; conductor: string; }
interface Ranking { nombre: string; icono: string; cat: string; ventas: number; stock: number; }
interface Resena { ini: string; nombre: string; tiempo: string; texto: string; }
interface Venta { etiquetas: string[]; valores: number[]; total: number; }
interface Bitacora {
  id: string; fecha: string; hora: string; usuario: string; rol: string; modulo: string; accion: string; sensible: boolean;
  registro: string; anterior: string; nuevo: string; ip: string; dispositivo: string; titulo: string;
}
interface Paso { nombre: string; hora: string; clase: string; tiempo: string; }

const TITULOS: Record<VistaId, string> = {
  'v-hub': 'Centro de Monitoreo Analítico VANABBY',
  'v-pedidos': 'Monitoreo de Pedidos y Envíos',
  'v-almacen': 'Monitoreo de Productos y Almacén',
  'v-clientes': 'Monitoreo de Clientes y Reseñas',
  'v-auditoria': 'Bitácora de Auditoría',
  'v-consumo': 'Analítica de Consumo - Harina de Trigo',
  'v-cliente-detalle': 'Analítica de Cliente - Ana García',
  'v-seguimiento': 'Seguimiento en Tiempo Real #PD-1052',
  'v-inspeccion': 'Inspección de Registro',
};

@Component({
  selector: 'app-monitoreo',
  imports: [FormsModule, RouterLink, FechaCortaPipe],
  templateUrl: './monitoreo.page.html',
  styleUrls: ['../../shared/base.css', './monitoreo.page.css'],
  encapsulation: ViewEncapsulation.None,
})
export class MonitoreoPage implements OnInit, OnDestroy {
  private v = inject(VanabbyService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly hoy = new Date();

  // =====================================================
  // DATOS DE EJEMPLO (sustituir por llamadas a la API)
  // =====================================================
  readonly kpisPedidosPorPeriodo: Record<Periodo, KpiPedidos> = {
    hoy:    { pend: 5,  prep: 6,  ruta: 3,  inc: 1,  efi: 98.5, entreg: 13,  cancel: 0,  retraso: 1,  prom: '~32 min' },
    semana: { pend: 12, prep: 18, ruta: 9,  inc: 3,  efi: 96.8, entreg: 87,  cancel: 2,  retraso: 5,  prom: '~35 min' },
    mes:    { pend: 31, prep: 40, ruta: 22, inc: 9,  efi: 95.4, entreg: 342, cancel: 11, retraso: 19, prom: '~38 min' },
  };
  readonly tracking: Tracking[] = [
    { folio: '#PD-1052', cliente: 'Ana García', hora: '14:45', estado: 'En camino', conductor: 'E. Torres' },
    { folio: '#PD-1054', cliente: 'Luis Mendoza', hora: '15:00', estado: 'Listo', conductor: 'R. Pérez' },
    { folio: '#PD-1056', cliente: 'Sofía Martínez', hora: '15:30', estado: 'En cocina', conductor: 'E. Torres' },
    { folio: '#PD-1058', cliente: 'Diego Flores', hora: '16:00', estado: 'En cocina', conductor: 'R. Pérez' },
    { folio: '#PD-1060', cliente: 'Valeria Cruz', hora: '16:30', estado: 'Pendiente', conductor: 'Sin asignar' },
  ];
  readonly claseEstado: Record<string, string> = { 'En camino': 'badge-lilac', 'Listo': 'badge-green', 'En cocina': 'badge-orange', 'Pendiente': 'badge-orange' };

  readonly ranking: Ranking[] = [
    { nombre: 'Red Velvet', icono: 'bi-cake2', cat: 'Pasteles', ventas: 42, stock: 70 },
    { nombre: 'Chocolate intenso', icono: 'bi-cake', cat: 'Pasteles', ventas: 32, stock: 50 },
    { nombre: 'Cupcake de vainilla', icono: 'bi-cup-hot', cat: 'Individual', ventas: 26, stock: 35 },
    { nombre: 'Tarta de limón', icono: 'bi-pie-chart', cat: 'Tartas', ventas: 0, stock: 0 },
  ];
  readonly materiaCritica: [string, number][] = [['Harina', 15], ['Mantequilla', 10], ['Huevos', 8]];
  readonly porCaducar: [string, string, string][] = [['Crema para batir', '15 Oct 2026', '2 días'], ['Fresa fresca', '16 Oct 2026', '3 días']];
  readonly resenas: Resena[] = [
    { ini: 'AG', nombre: 'Ana García', tiempo: 'Hace 20 min', texto: 'El Red Velvet tiene un sabor increíble… ¡Mi favorito!' },
    { ini: 'LM', nombre: 'Luis Mendoza', tiempo: 'Hace 1 hora', texto: 'Llegó puntual y en perfecto estado. Excelente atención.' },
    { ini: 'SM', nombre: 'Sofía Martínez', tiempo: 'Hace 2 horas', texto: 'El pastel personalizado quedó hermoso y delicioso.' },
  ];
  readonly ventasPorPeriodo: Record<Periodo, Venta> = {
    hoy:    { etiquetas: ['8h', '10h', '12h', '14h', '16h', '18h', '20h'], valores: [3200, 6800, 9400, 11200, 8700, 5300, 3900], total: 48500 },
    semana: { etiquetas: ['7 Oct', '8 Oct', '9 Oct', '10 Oct', '11 Oct', '12 Oct', '13 Oct'], valores: [32000, 35800, 40100, 49500, 51200, 44800, 48500], total: 298900 },
    mes:    { etiquetas: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'], valores: [262000, 281500, 290300, 298900], total: 1132700 },
  };
  /** Intensidad 0-4 por día (Lun-Dom) y franja horaria (8h..22h) */
  readonly demanda = [
    [0, 1, 1, 2, 2, 1, 1, 0], [0, 1, 2, 2, 2, 1, 1, 0], [0, 1, 2, 3, 2, 2, 1, 0],
    [1, 2, 3, 4, 4, 3, 2, 1], [1, 2, 3, 4, 4, 4, 3, 1], [1, 2, 2, 3, 3, 2, 2, 1], [0, 1, 1, 2, 2, 1, 1, 0],
  ];
  readonly dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly horas = ['08 h', '10 h', '12 h', '14 h', '16 h', '18 h', '20 h', '22 h'];
  readonly coloresCalor = ['#f1edfb', '#ddd2f8', '#c1aef2', '#9b7cea', '#7c3aed'];

  readonly bitacora: Bitacora[] = [
    { id: 'AUD-8821', fecha: '13 Oct 2026', hora: '14:30', usuario: 'P. M. Ramírez', rol: 'Admin', modulo: 'Productos', accion: 'Editar precio', sensible: true,
      registro: '#PRD-001 Red Velvet', anterior: '$480.00 MXN', nuevo: '$520.00 MXN', ip: '192.168.1.45', dispositivo: 'Chrome / Windows 11', titulo: 'Modificación de Precio en Catálogo' },
    { id: 'AUD-8820', fecha: '13 Oct 2026', hora: '14:15', usuario: 'J. Hernández', rol: 'Gerente', modulo: 'Pagos', accion: 'Cancelar pago', sensible: true,
      registro: '#PD-1045 Pedido', anterior: 'Pagado', nuevo: 'Cancelado', ip: '192.168.1.50', dispositivo: 'Safari · iPad', titulo: 'Cancelación de Pago' },
    { id: 'AUD-8819', fecha: '13 Oct 2026', hora: '13:50', usuario: 'C. Gómez', rol: 'Repostero', modulo: 'Pedidos', accion: 'Cambio de estado', sensible: false,
      registro: '#PD-1052', anterior: 'En preparación', nuevo: 'Listo', ip: '192.168.1.52', dispositivo: 'Chrome · Android', titulo: 'Cambio de estado de pedido' },
    { id: 'AUD-8818', fecha: '13 Oct 2026', hora: '12:10', usuario: 'A. Ruiz', rol: 'Marketing', modulo: 'Productos', accion: 'Crear cupón', sensible: false,
      registro: 'Promoción Cupcakes', anterior: '—', nuevo: 'Descuento 15%', ip: '192.168.1.60', dispositivo: 'Chrome · Mac', titulo: 'Creación de cupón' },
    { id: 'AUD-8817', fecha: '13 Oct 2026', hora: '11:45', usuario: 'E. Torres', rol: 'Repartidor', modulo: 'Envíos', accion: 'Entrega confirmada', sensible: false,
      registro: '#ENV-018', anterior: 'En camino', nuevo: 'Entregado', ip: '192.168.1.75', dispositivo: 'App · Android', titulo: 'Entrega confirmada' },
  ];
  readonly historialCliente: string[][] = [
    ['#PD-1052', '13 Oct 2026', 'Red Velvet', '$1,500', 'En camino'],
    ['#PD-1038', '06 Oct 2026', 'Cupcakes × 12', '$720', 'Entregado'],
    ['#PD-1012', '22 Sep 2026', 'Red Velvet', '$1,500', 'Entregado'],
    ['#PD-0981', '08 Sep 2026', 'Pastel vainilla', '$1,250', 'Entregado'],
  ];
  readonly proveedoresTiempo: [string, string, number, string][] = [
    ['Molinos del Sur', '2–3 días', 75, '#16a34a'], ['Harinera Central', '4–6 días', 50, '#f59e0b'], ['Trigos del Norte', '7–10 días', 28, '#dc2626'],
  ];
  readonly pasos: Paso[] = [
    { nombre: 'Recibido', hora: '10:00', clase: 'hecho', tiempo: 'Recibido → Cocina: 1 h 30 min' },
    { nombre: 'En Cocina', hora: '11:30', clase: 'hecho', tiempo: 'Cocina → Ruta: 2 h 30 min' },
    { nombre: 'En Ruta', hora: '14:00', clase: 'actual', tiempo: '' },
    { nombre: 'Entrega Estimada', hora: '14:45', clase: '', tiempo: '' },
  ];

  // =====================================================
  // NAVEGACIÓN ENTRE VISTAS (fragmento de la URL)
  // =====================================================
  vista = signal<VistaId>('v-hub');
  private tituloSeguimiento = signal(TITULOS['v-seguimiento']);
  tituloVista = computed(() => {
    const v = this.vista();
    if (v === 'v-seguimiento') return this.tituloSeguimiento();
    if (v === 'v-inspeccion') { const r = this.inspeccion(); return r ? `Inspección de Registro #${r.id}` : TITULOS[v]; }
    return TITULOS[v];
  });

  private fragSub?: { unsubscribe(): void };

  ir(id: VistaId) {
    this.mostrarVista(id);
    this.router.navigate([], { fragment: id, replaceUrl: false });
  }
  private mostrarVista(id: string | null) {
    this.vista.set(id && id in TITULOS ? (id as VistaId) : 'v-hub');
    window.scrollTo({ top: 0 });
  }

  // =====================================================
  // 2. PEDIDOS Y ENVÍOS
  // =====================================================
  periodoPedidos = signal<PeriodoTab>('hoy');
  private periodoPedidosEf = computed<Periodo>(() => this.efectivo(this.periodoPedidos()));
  kpi = computed(() => this.kpisPedidosPorPeriodo[this.periodoPedidosEf()]);
  pedOperacion = computed(() => {
    const p = this.periodoPedidosEf();
    return p === 'hoy' ? 'Operación de hoy · 13 Oct 2026' : p === 'semana' ? 'Últimos 7 días' : 'Últimos 30 días';
  });

  filtroTracking = signal('');
  trackingLista = computed(() => this.tracking.filter((t) => !this.filtroTracking() || t.estado === this.filtroTracking()));
  menuAbierto = signal<string | null>(null);

  /** "Personalizado" usa de momento los datos del mes hasta conectar un selector de fechas */
  private efectivo(p: PeriodoTab): Periodo { return p === 'custom' ? 'mes' : p; }

  toggleMenu(folio: string) { this.menuAbierto.update((m) => (m === folio ? null : folio)); }

  abrirSeguimiento(folio: string) {
    const t = this.tracking.find((x) => x.folio === folio);
    if (t) this.tituloSeguimiento.set(`Seguimiento en Tiempo Real ${t.folio}`);
    this.ir('v-seguimiento');
  }

  accion(a: 'seguir' | 'contactar' | 'reasignar' | 'incidencia', t: Tracking) {
    this.menuAbierto.set(null);
    if (a === 'seguir') this.abrirSeguimiento(t.folio);
    if (a === 'contactar') this.v.toast(`Contactando a ${t.cliente}…`);
    if (a === 'reasignar') this.v.toast(`Reasignación de repartidor para ${t.folio} solicitada.`, 'ok');
    if (a === 'incidencia') this.v.toast(`Incidencia registrada para ${t.folio}.`, 'error');
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    if (!(e.target as HTMLElement).closest('.kebab')) this.menuAbierto.set(null);
  }

  // =====================================================
  // 3. PRODUCTOS Y ALMACÉN
  // =====================================================
  modoRanking = signal<'mas' | 'menos'>('mas');
  periodoAlm = signal<PeriodoTab>('hoy');
  filtroCat = signal('');
  private readonly factorAlm: Record<Periodo, number> = { hoy: 1, semana: 6.5, mes: 27 };
  private readonly etiquetaAlm: Record<Periodo, string> = { hoy: 'hoy', semana: 'esta semana', mes: 'este mes' };

  topUds = computed(() => {
    const p = this.efectivo(this.periodoAlm());
    return `${Math.round(42 * this.factorAlm[p])} uds. ${this.etiquetaAlm[p]}`;
  });
  rankingLista = computed(() => {
    const cat = this.filtroCat();
    const fa = this.factorAlm[this.efectivo(this.periodoAlm())];
    const lista = this.ranking.filter((r) => !cat || r.cat === cat).map((r) => ({ ...r, ventas: Math.round(r.ventas * fa) }));
    const mas = this.modoRanking() === 'mas';
    return lista.sort((a, b) => (mas ? b.ventas - a.ventas : a.ventas - b.ventas));
  });

  // =====================================================
  // 4. CLIENTES Y RESEÑAS
  // =====================================================
  periodoClientes = signal<PeriodoTab>('hoy');
  private ventasPeriodo = computed<Periodo>(() => this.efectivo(this.periodoClientes()));
  ventas = computed(() => {
    // Al cargar la vista el original dibuja "semana" y solo cambia al pulsar una pestaña.
    const d = this.ventasPorPeriodo[this.ventasSel()];
    const max = Math.max(...d.valores);
    return {
      d,
      cols: d.valores.map((val, i) => ({ valor: val, etiqueta: d.etiquetas[i], k: (val / 1000).toFixed(1) + 'k', alto: (val / max) * 100, hoy: i === d.valores.length - 1 })),
    };
  });
  /** Periodo de ventas mostrado (inicia en "semana" como el original) */
  ventasSel = signal<Periodo>('semana');
  ventasTotal = computed(() => {
    const p = this.ventasSel();
    return `${p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Últimos 7 días' : 'Último mes'} · ${this.mon(this.ventas().d.total)} MXN`;
  });
  ventasHoy = `Hoy: ${this.mon(48500)} MXN`;

  setPeriodo(grupo: 'pedidos' | 'clientes' | 'almacen', p: PeriodoTab) {
    if (grupo === 'pedidos') this.periodoPedidos.set(p);
    if (grupo === 'clientes') { this.periodoClientes.set(p); this.ventasSel.set(this.efectivo(p)); }
    if (grupo === 'almacen') this.periodoAlm.set(p);
  }

  mon(n: number) { return this.v.moneda(n).replace('.00', ''); }
  moneda(n: number) { return this.v.moneda(n); }

  // =====================================================
  // 5. AUDITORÍA
  // =====================================================
  audBuscar = signal('');
  audRol = signal('');
  audModulo = signal('');
  soloSensibles = signal(false);
  audFecha = '2026-10-13';
  readonly roles = [...new Set(this.bitacora.map((b) => b.rol))];
  readonly modulos = [...new Set(this.bitacora.map((b) => b.modulo))];
  readonly sensiblesTotal = this.bitacora.filter((b) => b.sensible).length;

  bitacoraFiltrada = computed(() => {
    const q = this.audBuscar().trim().toLowerCase();
    return this.bitacora.filter((b) =>
      (!q || b.usuario.toLowerCase().includes(q) || b.accion.toLowerCase().includes(q) || b.registro.toLowerCase().includes(q)) &&
      (!this.audRol() || b.rol === this.audRol()) &&
      (!this.audModulo() || b.modulo === this.audModulo()) &&
      (!this.soloSensibles() || b.sensible));
  });

  inspeccion = signal<Bitacora | null>(null);
  inspTitulo = computed(() => {
    const r = this.inspeccion();
    return r ? `${r.accion} · ${r.registro.replace(/^#\S+\s?/, '') || r.registro}` : '';
  });
  inspSub = computed(() => {
    const r = this.inspeccion();
    return r ? `Registro afectado: ${r.registro.split(' ')[0]} · Módulo: ${r.modulo}` : '';
  });

  abrirInspeccion(r: Bitacora) {
    this.inspeccion.set(r);
    this.ir('v-inspeccion');
  }
  imprimir() { window.print(); }

  exportarBitacora() {
    const filas = [
      ['ID', 'Fecha', 'Hora', 'Usuario', 'Rol', 'Módulo', 'Acción', 'Registro', 'Anterior', 'Nuevo', 'IP', 'Dispositivo'],
      ...this.bitacoraFiltrada().map((b) => [b.id, b.fecha, b.hora, b.usuario, b.rol, b.modulo, b.accion, b.registro, b.anterior, b.nuevo, b.ip, b.dispositivo]),
    ];
    const csv = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'bitacora_vanabby.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    this.v.toast('Bitácora exportada (CSV).', 'ok');
  }

  // =====================================================
  // 6. CONSUMO (gráfica SVG con bindings)
  // =====================================================
  readonly cW = 520; readonly cH = 220;
  private readonly cmx = 40; private readonly cmy = 16; private readonly cMaxY = 60; private readonly cn = 30;
  private cx(i: number) { return this.cmx + (i / (this.cn - 1)) * (this.cW - this.cmx - 10); }
  cy(v: number) { return this.cH - 28 - (v / this.cMaxY) * (this.cH - 28 - this.cmy); }
  readonly cEjes = [0, 15, 30, 45, 60];
  readonly cX2 = this.cW - 10;
  readonly cPuntos = Array.from({ length: this.cn }, (_, i) => 14 + Math.sin(i * 1.7) * 1.4 + Math.cos(i * 0.9) * 0.9)
    .map((val, i) => `${this.cx(i).toFixed(1)},${this.cy(val).toFixed(1)}`).join(' ');
  readonly cFechas = ['14 Sep', '20 Sep', '27 Sep', '4 Oct', '11 Oct', '13 Oct']
    .map((f, i) => ({ f, x: this.cx(Math.round((i / 5) * (this.cn - 1))) }));
  readonly autonomia = (15 / 12).toFixed(1) + ' días';

  // =====================================================
  // 7. CLIENTE: gráfica de calificación
  // =====================================================
  readonly rW = 220; readonly rH = 110;
  private rx(i: number) { return 22 + (i / 5) * (this.rW - 32); }
  ry(val: number) { return this.rH - 20 - ((val - 3) / 2) * (this.rH - 36); }
  readonly rEjes = [3, 4, 5];
  readonly rPuntos = [3.7, 4.2, 4.8, 5, 5, 5].map((val, i) => `${this.rx(i)},${this.ry(val)}`).join(' ');
  readonly rMeses = ['Feb', 'Abr', 'Jun', 'Ago', 'Oct'].map((m, i) => ({ m, x: this.rx(i + (i === 4 ? 1 : 0)) }));

  // =====================================================
  // 8. SEGUIMIENTO: animación del repartidor
  // =====================================================
  camX = signal(105);
  camY = signal(90);
  velocidad = signal('32 km/h');
  private timer?: ReturnType<typeof setInterval>;

  private animarCamion() {
    const ruta = [[35, 150], [35, 110], [105, 110], [105, 70], [235, 70], [235, 25]];
    let seg = 2, t = 0;
    this.timer = setInterval(() => {
      if (this.vista() !== 'v-seguimiento') return;
      t += 0.04;
      if (t >= 1) { t = 0; seg = seg >= ruta.length - 2 ? 1 : seg + 1; }
      const [x1, y1] = ruta[seg], [x2, y2] = ruta[seg + 1];
      this.camX.set(x1 + (x2 - x1) * t);
      this.camY.set(y1 + (y2 - y1) * t);
      this.velocidad.set(28 + Math.round(Math.sin(Date.now() / 1500) * 4 + 4) + ' km/h');
    }, 120);
  }

  // =====================================================
  // INICIO
  // =====================================================
  ngOnInit() {
    this.fragSub = this.route.fragment.subscribe((f) => this.mostrarVista(f));
    this.animarCamion();
  }
  ngOnDestroy() {
    this.fragSub?.unsubscribe();
    clearInterval(this.timer);
  }

  cerrarSesion(ev: Event) {
    ev.preventDefault();
    if (confirm('¿Deseas cerrar sesión?')) this.router.navigate(['/login']);
  }
}
