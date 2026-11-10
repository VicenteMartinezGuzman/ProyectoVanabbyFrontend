import { Component, HostListener, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FechaCortaPipe, MonedaPipe } from '../../core/fecha-actual.pipe';
import { VanabbyService } from '../../core/vanabby.service';

interface Insumo { id: number; nombre: string; icono: string; stock: number; precio: number; }
interface Proveedor {
  id: number; nombre: string; correo: string; telefono: string; categoria: string; insumo?: string;
  colonia?: string; calle?: string; cp?: string; numExt?: string; municipio?: string; numInt?: string; estado?: string;
}
interface LineaOrden { id: number; cantidad: number; }
type FormProv = Required<Omit<Proveedor, 'id'>>;

const CATEGORIAS = ['Repostería', 'General', 'Harinas', 'Insumos', 'Lácteos'];

const formVacio = (): FormProv => ({
  nombre: '', telefono: '', correo: '', categoria: '', insumo: '',
  colonia: '', calle: '', cp: '', numExt: '', municipio: '', numInt: '', estado: '',
});

@Component({
  selector: 'app-compras',
  imports: [FormsModule, RouterLink, FechaCortaPipe, MonedaPipe],
  templateUrl: './compras.page.html',
  styleUrls: ['../../shared/base.css', './compras.page.css'],
  encapsulation: ViewEncapsulation.None,
})
export class ComprasPage {
  private v = inject(VanabbyService);
  private router = inject(Router);

  readonly hoy = new Date();
  readonly categorias = CATEGORIAS;

  /* ---------- Datos de ejemplo ---------- */
  readonly insumos = signal<Insumo[]>([
    { id: 1, nombre: 'Chispas de Chocolate', icono: 'bi-droplet-half', stock: 15, precio: 10 },
    { id: 2, nombre: 'Harina', icono: 'bi-flower1', stock: 20, precio: 8 },
    { id: 3, nombre: 'Mermelada de Mora', icono: 'bi-archive', stock: 6, precio: 16 },
    { id: 4, nombre: 'Granillo de Colores', icono: 'bi-stars', stock: 8, precio: 9 },
    { id: 5, nombre: 'Cerezas en Almíbar', icono: 'bi-apple', stock: 10, precio: 25 },
  ]);

  readonly proveedores = signal<Proveedor[]>([
    { id: 1, nombre: 'Decoraciones Dulces MX', correo: 'hola@decoracionesdulces.mx', telefono: '9511002005', categoria: 'Repostería' },
    { id: 2, nombre: 'Dulcería La Estrella', correo: 'ventas@dulceriaestrella.mx', telefono: '9511002001', categoria: 'General' },
    { id: 3, nombre: 'Harinas del Valle', correo: 'compras@harinasvalle.mx', telefono: '9511002004', categoria: 'Harinas' },
    { id: 4, nombre: 'Insumos Reposteros Oaxaca', correo: 'contacto@insumosreposteros.mx', telefono: '9511002002', categoria: 'Insumos' },
    { id: 5, nombre: 'Lacteos San Jose', correo: 'pedidos@lactoossanjose.mx', telefono: '9511002003', categoria: 'Lácteos' },
  ]);

  private siguienteIdProv = 6;

  /* ---------- Estado de pantalla ---------- */
  readonly busqueda = signal('');
  readonly orden = signal<LineaOrden[]>([]);
  readonly proveedorSel = signal('');
  readonly proveedorEditando = signal<number | null>(null);
  readonly proveedorEliminar = signal<number | null>(null);

  readonly modalProveedor = signal(false);
  readonly modalLista = signal(false);
  readonly modalEliminar = signal(false);

  form: FormProv = formVacio();
  readonly errores = signal<Partial<Record<'nombre' | 'telefono' | 'correo' | 'categoria', string>>>({});

  /* ---------- Derivados ---------- */
  readonly filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return this.insumos().filter((i) => i.nombre.toLowerCase().includes(q));
  });
  readonly unidades = computed(() => this.orden().reduce((s, o) => s + o.cantidad, 0));
  readonly total = computed(() => this.orden().reduce((s, o) => s + o.cantidad * this.insumo(o.id).precio, 0));
  readonly lineas = computed(() => this.orden().map((o) => ({ ...o, insumo: this.insumo(o.id) })));
  readonly nombreEliminar = computed(() => this.proveedores().find((p) => p.id === this.proveedorEliminar())?.nombre ?? '');

  constructor() {
    this.proveedores.set(this.v.cargar('proveedores', this.proveedores()));
    this.siguienteIdProv = this.v.cargar('proveedoresSiguiente', this.siguienteIdProv);
    const stockGuardado = this.v.cargar<Record<string, number>>('stockInsumos', {});
    this.insumos.update((l) => l.map((i) => (stockGuardado[i.id] != null ? { ...i, stock: stockGuardado[i.id] } : i)));

    // Estado inicial igual al mockup: orden con 2 insumos
    this.proveedorSel.set('1');
    this.agregar(4); this.agregar(4); this.agregar(4); this.agregar(4);
    this.agregar(3);
  }

  private insumo(id: number): Insumo { return this.insumos().find((x) => x.id === id)!; }

  claseStock(s: number): string { return s <= 8 ? 'badge-red' : s <= 15 ? 'badge-orange' : 'badge-green'; }

  private persistir(): void {
    this.v.guardar('proveedores', this.proveedores());
    this.v.guardar('proveedoresSiguiente', this.siguienteIdProv);
    this.v.guardar('stockInsumos', Object.fromEntries(this.insumos().map((i) => [i.id, i.stock])));
  }

  /* ---------- Acciones de la orden ---------- */
  agregar(id: number): void {
    this.orden.update((l) =>
      l.some((x) => x.id === id) ? l.map((x) => (x.id === id ? { ...x, cantidad: x.cantidad + 1 } : x)) : [...l, { id, cantidad: 1 }]);
  }

  cambiarCantidad(id: number, delta: number): void {
    this.orden.update((l) => l.map((x) => (x.id === id ? { ...x, cantidad: x.cantidad + delta } : x)).filter((x) => x.cantidad > 0));
  }

  quitar(id: number): void { this.orden.update((l) => l.filter((o) => o.id !== id)); }

  registrarCompra(): void {
    if (!this.proveedorSel()) return this.v.toast('Selecciona un proveedor.', 'error');
    if (!this.orden().length) return this.v.toast('Agrega al menos un insumo a la orden.', 'error');
    const total = this.total();
    // La compra incrementa las existencias del almacén
    const orden = this.orden();
    this.insumos.update((l) => l.map((i) => {
      const o = orden.find((x) => x.id === i.id);
      return o ? { ...i, stock: i.stock + o.cantidad } : i;
    }));
    const prov = this.proveedores().find((p) => String(p.id) === this.proveedorSel())!;
    this.v.toast(`Compra registrada con ${prov.nombre} por ${this.v.moneda(total)}`, 'ok');
    this.persistir();
    this.orden.set([]);
    this.proveedorSel.set('');
  }

  /* ---------- Proveedores ---------- */
  abrirFormProveedor(id: number | null = null): void {
    this.proveedorEditando.set(id);
    this.form = formVacio();
    this.errores.set({});
    if (id) {
      const p = this.proveedores().find((x) => x.id === id)!;
      this.form = {
        nombre: p.nombre, telefono: p.telefono, correo: p.correo, categoria: p.categoria, insumo: p.insumo || '',
        colonia: p.colonia || '', calle: p.calle || '', cp: p.cp || '', numExt: p.numExt || '',
        municipio: p.municipio || '', numInt: p.numInt || '', estado: p.estado || '',
      };
    }
    this.modalProveedor.set(true);
  }

  abrirLista(): void { this.modalLista.set(true); }

  editarProveedor(id: number): void { this.modalLista.set(false); this.abrirFormProveedor(id); }

  pedirEliminar(id: number): void { this.proveedorEliminar.set(id); this.modalEliminar.set(true); }

  confirmarEliminar(): void {
    const id = this.proveedorEliminar();
    this.proveedores.update((l) => l.filter((p) => p.id !== id));
    this.modalEliminar.set(false);
    this.persistir();
    this.v.toast('Proveedor eliminado.');
  }

  private validar(): boolean {
    const f = this.form;
    const err: Record<string, string> = {};
    if (!f.nombre.trim()) err['nombre'] = 'El nombre es obligatorio.';
    if (!/^\d{10}$/.test(f.telefono.replace(/\s/g, ''))) err['telefono'] = 'Ingresa 10 dígitos.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo)) err['correo'] = 'Correo no válido.';
    if (!f.categoria) err['categoria'] = 'Selecciona una categoría.';
    else if (!CATEGORIAS.includes(f.categoria)) err['categoria'] = 'Elige una categoría de la lista.';
    this.errores.set(err);
    return Object.keys(err).length === 0;
  }

  guardarProveedor(): void {
    if (!this.validar()) return;
    const f = this.form;
    const datos = {
      nombre: f.nombre.trim(), telefono: f.telefono.replace(/\s/g, ''), correo: f.correo.trim(),
      categoria: f.categoria, insumo: f.insumo.trim(),
      colonia: f.colonia.trim(), calle: f.calle.trim(), cp: f.cp.trim(),
      numExt: f.numExt.trim(), municipio: f.municipio.trim(), numInt: f.numInt.trim(), estado: f.estado.trim(),
    };
    const editando = this.proveedorEditando();
    if (editando) {
      this.proveedores.update((l) => l.map((p) => (p.id === editando ? { ...p, ...datos } : p)));
      this.v.toast('Proveedor actualizado.', 'ok');
    } else {
      this.proveedores.update((l) => [...l, { id: this.siguienteIdProv++, ...datos }]);
      this.v.toast('Proveedor registrado.', 'ok');
    }
    this.modalProveedor.set(false);
    this.persistir();
  }

  /* ---------- Modales / sesión ---------- */
  cerrarSiFondo(ev: Event, modal: 'proveedor' | 'lista' | 'eliminar'): void {
    if (ev.target !== ev.currentTarget) return;
    this.cerrar(modal);
  }

  cerrar(modal: 'proveedor' | 'lista' | 'eliminar'): void {
    if (modal === 'proveedor') this.modalProveedor.set(false);
    else if (modal === 'lista') this.modalLista.set(false);
    else this.modalEliminar.set(false);
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.modalProveedor.set(false);
    this.modalLista.set(false);
    this.modalEliminar.set(false);
  }

  salir(ev: Event): void {
    ev.preventDefault();
    if (confirm('¿Deseas cerrar sesión?')) this.router.navigateByUrl('/login');
  }
}
