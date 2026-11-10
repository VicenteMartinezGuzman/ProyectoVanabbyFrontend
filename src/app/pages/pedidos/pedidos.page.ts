import { Component, HostListener, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { VanabbyService } from '../../core/vanabby.service';
import { FechaCortaPipe, MonedaPipe } from '../../core/fecha-actual.pipe';

interface Cliente { id: number; nombre: string; telefono: string; colonia: string; calle: string; ext: string; int: string; municipio: string; estado: string; cp: string; }
interface Producto { id: number; nombre: string; precio: number; }
interface Item { pid: number; cant: number; }
interface Pedido {
  id: string; clienteId: number; fecha: string; hora: string; modalidad: string;
  estado: string; prioridad: string; items: Item[]; motivoCancelacion?: string; comentario?: string;
}

const CLIENTE_VACIO: Cliente = { id: 0, nombre: '', telefono: '', colonia: '', calle: '', ext: '', int: '', municipio: '', estado: '', cp: '' };

@Component({
  selector: 'app-pedidos',
  imports: [FormsModule, RouterLink, FechaCortaPipe, MonedaPipe],
  templateUrl: './pedidos.page.html',
  styleUrls: ['../../shared/base.css', './pedidos.page.css'],
  encapsulation: ViewEncapsulation.None,
})
export class PedidosPage {
  private v = inject(VanabbyService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  readonly clientes: Cliente[] = [
    { id: 1, nombre: 'María García', telefono: '951 123 4567', colonia: 'Centro', calle: 'Av. Juárez', ext: '100', int: '', municipio: 'Oaxaca de Juárez', estado: 'Oaxaca', cp: '68000' },
    { id: 2, nombre: 'Juan Pérez', telefono: '951 300 4002', colonia: 'Reforma', calle: 'Calle Reforma', ext: '101', int: '2', municipio: 'Oaxaca de Juárez', estado: 'Oaxaca', cp: '68050' },
    { id: 3, nombre: 'Carlos Ruiz', telefono: '951 300 4003', colonia: 'Cinco Señores', calle: 'Av. Universidad', ext: '220', int: 'B', municipio: 'Oaxaca de Juárez', estado: 'Oaxaca', cp: '68120' },
    { id: 4, nombre: 'Sofía Hernández', telefono: '951 300 4005', colonia: 'La Merced', calle: 'Calle Murguía', ext: '77', int: '', municipio: 'Oaxaca de Juárez', estado: 'Oaxaca', cp: '68000' },
  ];
  readonly productos: Producto[] = [
    { id: 1, nombre: 'Pastel de Chocolate', precio: 350 },
    { id: 2, nombre: 'Galletas de Vainilla', precio: 90 },
    { id: 3, nombre: 'Red Velvet', precio: 480 },
    { id: 4, nombre: 'Chocolate Cupcake', precio: 550 },
    { id: 5, nombre: 'Fruit Tarte', precio: 600 },
  ];
  readonly COSTO_ENVIO = 40;
  readonly ESTADOS = ['Pendiente', 'En preparación', 'En reparto', 'Entregado', 'Cancelado'];
  readonly PRIORIDADES = ['Urgente', 'Normal', 'No urgente'];
  readonly MOTIVOS = ['Cliente solicitó cancelación', 'Falta de insumos', 'Problema con la entrega', 'Otro'];
  readonly hoy = new Date();

  private readonly pedidosIniciales: Pedido[] = [
    { id: 'PED-20', clienteId: 1, fecha: '2026-10-16', hora: '14:30', modalidad: 'A domicilio', estado: 'Entregado', prioridad: 'Urgente', items: [{ pid: 1, cant: 1 }, { pid: 2, cant: 2 }] },
    { id: 'PED-21', clienteId: 2, fecha: '2026-10-15', hora: '11:00', modalidad: 'A domicilio', estado: 'En reparto', prioridad: 'Urgente', items: [{ pid: 3, cant: 1 }] },
    { id: 'PED-23', clienteId: 3, fecha: '2026-10-15', hora: '16:00', modalidad: 'Recoger en tienda', estado: 'En preparación', prioridad: 'Normal', items: [{ pid: 2, cant: 2 }] },
    { id: 'PED-24', clienteId: 4, fecha: '2026-10-16', hora: '10:00', modalidad: 'A domicilio', estado: 'Entregado', prioridad: 'Urgente', items: [{ pid: 1, cant: 1 }] },
    { id: 'PED-25', clienteId: 1, fecha: '2026-10-14', hora: '09:30', modalidad: 'A domicilio', estado: 'Entregado', prioridad: 'Urgente', items: [{ pid: 1, cant: 1 }] },
    { id: 'PED-26', clienteId: 1, fecha: '2026-10-15', hora: '13:00', modalidad: 'A domicilio', estado: 'Pendiente', prioridad: 'No urgente', items: [{ pid: 2, cant: 2 }] },
    { id: 'PED-27', clienteId: 1, fecha: '2026-10-17', hora: '12:00', modalidad: 'A domicilio', estado: 'En preparación', prioridad: 'Normal', items: [{ pid: 1, cant: 1 }] },
  ];

  pedidos = signal<Pedido[]>(this.v.cargar('pedidos', this.pedidosIniciales));
  private siguiente = this.v.cargar('pedidosSiguiente', 28);

  filtroEstado = signal('');
  lista = computed(() => this.pedidos().filter((p) => !this.filtroEstado() || p.estado === this.filtroEstado()));

  // Modales
  modalRegistrar = signal(false);
  modalCancelar = signal(false);
  modalComprobante = signal(false);

  // Registro / edición
  editandoId = signal<string | null>(null);
  buscar = signal('');
  clienteSel = signal('');
  modalidad = '';
  fecha = '';
  hora = '';
  prioridad = 'Normal';
  prodSel = 1;
  cantidad = 1;
  borrador = signal<Item[]>([]);
  modalidadSig = signal('');
  errores = signal<Record<string, string>>({});
  fechaMin = '';

  // Cancelar
  cancelando = signal<Pedido | null>(null);
  motivo = this.MOTIVOS[0];
  comentario = '';

  // Comprobante
  verPedido = signal<Pedido | null>(null);
  qrHtml = computed<SafeHtml>(() => {
    const p = this.verPedido();
    return p ? this.sanitizer.bypassSecurityTrustHtml(this.v.qr(p.id)) : '';
  });

  clientesFiltrados = computed(() => {
    const q = this.buscar().toLowerCase();
    return this.clientes.filter((c) => c.nombre.toLowerCase().includes(q));
  });
  clienteActual = computed(() => this.cliente(Number(this.clienteSel())) ?? CLIENTE_VACIO);
  subtotalBorrador = computed(() => this.subtotal(this.borrador()));
  envioBorrador = computed(() => this.envio(this.modalidadSig()));
  totalBorrador = computed(() => this.subtotalBorrador() + this.envioBorrador());

  // ---------- utilidades ----------
  cliente(id: number) { return this.clientes.find((c) => c.id === id); }
  producto(id: number) { return this.productos.find((p) => p.id === id)!; }
  slug(t: string) { return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-'); }
  subtotal(items: Item[]) { return items.reduce((s, i) => s + this.producto(i.pid).precio * i.cant, 0); }
  envio(mod: string) { return mod === 'A domicilio' ? this.COSTO_ENVIO : 0; }
  total(p: Pedido) { return this.subtotal(p.items) + this.envio(p.modalidad); }
  fechaLarga(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${this.v.meses[m - 1]} ${y}`;
  }
  claseEstado(e: string) {
    return ({ 'Entregado': 'est-entregado', 'En reparto': 'est-reparto', 'En preparación': 'est-preparacion', 'Pendiente': 'est-pendiente', 'Cancelado': 'est-cancelado' } as Record<string, string>)[e];
  }
  clasePrioridad(p: string) { return 'pri-' + this.slug(p); }
  opcionesEstado(p: Pedido) { return this.ESTADOS.filter((e) => e !== 'Cancelado' || p.estado === 'Cancelado'); }
  direccion(c: Cliente) { return `${c.calle} ${c.ext}, Col. ${c.colonia}, ${c.municipio}`; }

  private persistir() {
    this.v.guardar('pedidos', this.pedidos());
    this.v.guardar('pedidosSiguiente', this.siguiente);
  }
  private actualizar() { this.pedidos.update((l) => [...l]); this.persistir(); }

  cerrarSesion() { if (confirm('¿Deseas cerrar sesión?')) this.router.navigateByUrl('/login'); }

  // ---------- tabla ----------
  cambiarEstado(p: Pedido, valor: string) {
    p.estado = valor;
    this.v.toast(`${p.id}: estado → ${p.estado}`, 'ok');
    this.actualizar();
  }
  cambiarPrioridad(p: Pedido, valor: string) { p.prioridad = valor; this.actualizar(); }

  // ---------- cancelar ----------
  abrirCancelar(p: Pedido) {
    this.cancelando.set(p);
    this.comentario = '';
    this.motivo = this.MOTIVOS[0];
    this.modalCancelar.set(true);
  }
  confirmarCancelar() {
    const p = this.cancelando();
    if (!p) return;
    p.estado = 'Cancelado';
    p.motivoCancelacion = this.motivo;
    p.comentario = this.comentario.trim();
    this.modalCancelar.set(false);
    this.v.toast(`Pedido ${p.id} cancelado.`);
    this.actualizar();
  }

  // ---------- comprobante ----------
  abrirComprobante(p: Pedido) { this.verPedido.set(p); this.modalComprobante.set(true); }
  imprimir() { window.print(); }

  // ---------- registro ----------
  abrirRegistro(edit: Pedido | null = null) {
    this.editandoId.set(edit ? edit.id : null);
    this.errores.set({});
    this.buscar.set('');
    this.clienteSel.set(edit ? String(edit.clienteId) : '');
    this.modalidad = edit ? edit.modalidad : '';
    this.modalidadSig.set(this.modalidad);
    this.fecha = edit ? edit.fecha : '';
    this.hora = edit ? edit.hora : '';
    this.prioridad = edit ? edit.prioridad : 'Normal';
    this.prodSel = this.productos[0].id;
    this.cantidad = 1;
    this.borrador.set(edit ? edit.items.map((i) => ({ ...i })) : []);
    this.fechaMin = edit ? '' : new Date().toISOString().slice(0, 10);
    this.modalRegistrar.set(true);
  }

  agregarProducto() {
    const pid = Number(this.prodSel);
    const cant = Math.max(1, parseInt(String(this.cantidad), 10) || 1);
    const lista = this.borrador().map((i) => ({ ...i }));
    const ex = lista.find((i) => i.pid === pid);
    if (ex) ex.cant += cant; else lista.push({ pid, cant });
    this.borrador.set(lista);
    this.cantidad = 1;
    this.errores.update((e) => ({ ...e, items: '' }));
  }
  quitar(idx: number) { this.borrador.update((l) => l.filter((_, i) => i !== idx)); }

  guardar() {
    const err: Record<string, string> = {};
    if (!this.clienteSel()) err['cliente'] = 'Selecciona un cliente.';
    if (!this.modalidad) err['modalidad'] = 'Elige la modalidad.';
    if (!this.fecha) err['fecha'] = 'Indica la fecha.';
    if (!this.hora) err['hora'] = 'Indica la hora.';
    if (!this.borrador().length) err['items'] = 'Agrega al menos un producto.';
    this.errores.set(err);
    if (Object.keys(err).length) return;

    const items = this.borrador().map((i) => ({ ...i }));
    const editId = this.editandoId();
    if (editId) {
      const p = this.pedidos().find((x) => x.id === editId)!;
      Object.assign(p, { clienteId: Number(this.clienteSel()), fecha: this.fecha, hora: this.hora, modalidad: this.modalidad, prioridad: this.prioridad, items });
      this.modalRegistrar.set(false);
      this.v.toast(`Pedido ${p.id} actualizado (${this.v.moneda(this.total(p))})`, 'ok');
      this.editandoId.set(null);
      this.actualizar();
      return;
    }
    const nuevo: Pedido = {
      id: 'PED-' + this.siguiente++, clienteId: Number(this.clienteSel()), fecha: this.fecha, hora: this.hora,
      modalidad: this.modalidad, estado: 'Pendiente', prioridad: this.prioridad, items,
    };
    this.pedidos.update((l) => [...l, nuevo]);
    this.modalRegistrar.set(false);
    this.v.toast(`Pedido ${nuevo.id} registrado por ${this.v.moneda(this.total(nuevo))}`, 'ok');
    this.persistir();
  }

  cerrarOverlay(ev: Event, modal: 'registrar' | 'cancelar' | 'comprobante') {
    if ((ev.target as HTMLElement).classList.contains('modal-overlay')) this.cerrar(modal);
  }
  cerrar(modal: 'registrar' | 'cancelar' | 'comprobante') {
    if (modal === 'registrar') this.modalRegistrar.set(false);
    if (modal === 'cancelar') this.modalCancelar.set(false);
    if (modal === 'comprobante') this.modalComprobante.set(false);
  }

  @HostListener('document:keydown.escape')
  onEsc() { this.modalRegistrar.set(false); this.modalCancelar.set(false); this.modalComprobante.set(false); }
}
