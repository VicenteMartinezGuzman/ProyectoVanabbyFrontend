import { DecimalPipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewEncapsulation, WritableSignal, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { BootstrapCssService } from '../../core/bootstrap-css.service';

type Estado = 'Disponible' | 'Terminado' | 'En horno' | 'En proceso';
type Color = 'success' | 'warning' | 'danger';

interface Producto {
  nombre: string;
  categoria: string;
  estado: Estado;
  precio: number;
  stock: number;
  formato: string;
  conservacion: string;
  preparacion: string;
  imagen: string;
  descripcion: string;
  nota: string;
}

const TODOS_ESTADO = 'Disponibilidad: Todos';
const TODOS_TIPO = 'Tipo: Todos';

/** Mismos tonos que el objeto `colores` del JS original. */
const COLORES: Record<Estado, Color> = {
  'Disponible': 'success',
  'Terminado': 'success',
  'En horno': 'warning',
  'En proceso': 'danger',
};

const IMAGEN_PROVISIONAL = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 250">
        <rect width="600" height="250" fill="#f0edf6"/>
        <text x="300" y="115" text-anchor="middle"
              font-family="Arial" font-size="22" fill="#673ab7">
            Repostería Vanabby
        </text>
        <text x="300" y="150" text-anchor="middle"
              font-family="Arial" font-size="16" fill="#777">
            Imagen pendiente
        </text>
    </svg>
`);

@Component({
  selector: 'app-productos',
  imports: [FormsModule, RouterLink, DecimalPipe],
  templateUrl: './productos.page.html',
  styleUrl: './productos.page.css',
  encapsulation: ViewEncapsulation.None,
})
export class ProductosPage implements OnInit, OnDestroy {
  private bs = inject(BootstrapCssService);
  private router = inject(Router);

  @ViewChild('modalRegistrar', { static: true }) modalRegistrarEl!: ElementRef<HTMLElement>;
  @ViewChild('modalDetalle', { static: true }) modalDetalleEl!: ElementRef<HTMLElement>;
  @ViewChild('modalEditar', { static: true }) modalEditarEl!: ElementRef<HTMLElement>;
  @ViewChild('modalEliminar', { static: true }) modalEliminarEl!: ElementRef<HTMLElement>;

  private modales: Modal[] = [];
  mRegistrar?: Modal;
  mDetalle?: Modal;
  mEditar?: Modal;
  mEliminar?: Modal;

  readonly TODOS_ESTADO = TODOS_ESTADO;
  readonly TODOS_TIPO = TODOS_TIPO;

  private formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  moneda(n: number | string | null | undefined) { return this.formatoMoneda.format(Number(n) || 0); }

  // Fecha de la barra superior
  readonly fecha = new Date();
  readonly fechaIso = [
    this.fecha.getFullYear(),
    String(this.fecha.getMonth() + 1).padStart(2, '0'),
    String(this.fecha.getDate()).padStart(2, '0'),
  ].join('-');
  readonly fechaTexto = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(this.fecha);

  productos = signal<Producto[]>([
    {
      nombre: 'Pastel de terciopelo rojo', categoria: 'Pasteles', estado: 'Disponible', precio: 480, stock: 8,
      formato: 'Pastel de 3 pisos', conservacion: '2 °C a 4 °C', preparacion: '60 min',
      imagen: 'img/red-velvet.jpg', descripcion: 'Pastel especial · 3 pisos · Queso crema', nota: 'Listo en vitrina',
    },
    {
      nombre: 'Cupcake de fresa', categoria: 'Cupcakes', estado: 'Terminado', precio: 508, stock: 22,
      formato: 'Cupcake individual', conservacion: '2 °C a 4 °C', preparacion: '35 min',
      imagen: 'img/cupcake-fresa.jpg', descripcion: 'Cupcake · Crema de fresa natural', nota: 'Disponibilidad alta',
    },
    {
      nombre: 'Cupcake de chocolate', categoria: 'Cupcakes', estado: 'Terminado', precio: 507, stock: 28,
      formato: 'Cupcake individual', conservacion: 'Lugar fresco', preparacion: '35 min',
      imagen: 'img/chocolate-cupcake.jpg', descripcion: 'Cupcake · Ganache de chocolate y cacao', nota: 'Disponibilidad alta',
    },
    {
      nombre: 'Tarta de frutas mixtas', categoria: 'Tartas y pays', estado: 'En horno', precio: 600, stock: 6,
      formato: 'Tarta mediana', conservacion: '2 °C a 4 °C', preparacion: '50 min',
      imagen: 'img/fruit-tarte.jpg', descripcion: 'Tarta y pay · Frutas frescas de temporada', nota: 'Producción activa',
    },
    {
      nombre: 'Cupcake de limón y merengue', categoria: 'Cupcakes', estado: 'En proceso', precio: 505, stock: 26,
      formato: 'Cupcake individual', conservacion: '2 °C a 4 °C', preparacion: '40 min',
      imagen: 'img/cupcake-limon.jpg', descripcion: 'Cupcake · Merengue italiano tostado', nota: 'Producción activa',
    },
  ]);

  // Filtros
  filtroEstado = signal(TODOS_ESTADO);
  filtroCategoria = signal(TODOS_TIPO);
  busqueda = signal('');

  visibles = computed(() => {
    const est = this.filtroEstado();
    const cat = this.filtroCategoria();
    const q = this.busqueda().trim().toLowerCase();
    return this.productos().filter(p =>
      (est === TODOS_ESTADO || p.estado === est) &&
      (cat === TODOS_TIPO || p.categoria === cat) &&
      (!q || p.nombre.toLowerCase().includes(q)));
  });

  // Producto seleccionado (por defecto el primero, como en el original)
  seleccionado = signal<Producto>(this.productos()[0]);

  // Registrar
  rNombre = signal('');
  rCategoria = signal('Tartas y pays');
  rCliente = signal('Venta general (vitrina)');
  rPrecio = signal<number | null>(450);
  rCantidad = signal<number | null>(12);
  rMolde = signal(true);
  rFruta = signal(true);
  rCrema = signal(false);
  rProduccion = signal(true);

  // Editar
  eNombre = signal('');
  eCategoria = signal('Pasteles');
  eEstado = signal<string>('Disponible');
  ePrecio = signal<number | null>(0);
  eCantidad = signal<number | null>(0);
  eImagen = signal('img/red-velvet.jpg');
  eResumen = computed(() => this.moneda(Math.max(0, Number(this.ePrecio()) || 0)));

  color(estado: string): Color { return COLORES[estado as Estado]; }

  ngOnInit() {
    this.bs.enable();
    this.mRegistrar = new Modal(this.modalRegistrarEl.nativeElement);
    this.mDetalle = new Modal(this.modalDetalleEl.nativeElement);
    this.mEditar = new Modal(this.modalEditarEl.nativeElement);
    this.mEliminar = new Modal(this.modalEliminarEl.nativeElement);
    this.modales = [this.mRegistrar, this.mDetalle, this.mEditar, this.mEliminar];
  }

  ngOnDestroy() {
    this.modales.forEach(m => m.dispose());
    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    this.bs.disable();
  }

  // --- Apertura / cierre de modales ---

  abrirRegistrar() { this.mRegistrar?.show(); }

  abrirDetalle(p: Producto) {
    this.seleccionado.set(p);
    this.mDetalle?.show();
  }

  abrirEliminar(p?: Producto) {
    if (p) this.seleccionado.set(p);
    this.mEliminar?.show();
  }

  /** Como data-bs-toggle="modal": cierra el modal abierto y muestra el de edición. */
  abrirEditar(desde?: Modal) {
    desde?.hide();
    const p = this.seleccionado();
    this.eNombre.set(p.nombre);
    this.eCategoria.set(p.categoria);
    this.eEstado.set(p.estado);
    this.ePrecio.set(p.precio);
    this.eCantidad.set(p.stock);
    this.eImagen.set(p.imagen);
    this.mEditar?.show();
  }

  eliminarDesdeEditar() {
    this.mEditar?.hide();
    this.mEliminar?.show();
  }

  cerrar(m: Modal | undefined) { m?.hide(); }

  // --- Formularios ---

  /** Controles de cantidad (+/−) con mínimo. */
  ajustar(campo: WritableSignal<number | null>, ajuste: number, minimo: number) {
    campo.set(Math.max(minimo, (Number(campo()) || 0) + ajuste));
  }

  limpiarRegistrar() {
    this.rNombre.set('');
    this.rCategoria.set('Tartas y pays');
    this.rCliente.set('Venta general (vitrina)');
    this.rPrecio.set(450);
    this.rCantidad.set(12);
    this.rMolde.set(true);
    this.rFruta.set(true);
    this.rCrema.set(false);
    this.rProduccion.set(true);
  }

  limpiarFiltros() {
    this.filtroEstado.set(TODOS_ESTADO);
    this.filtroCategoria.set(TODOS_TIPO);
    this.busqueda.set('');
  }

  evitarEnvio(e: Event) { e.preventDefault(); }

  resetRegistrar(e: Event) { e.preventDefault(); this.limpiarRegistrar(); }
  resetFiltros(e: Event) { e.preventDefault(); this.limpiarFiltros(); }

  /** Vista previa de fotografía. */
  cambiarFoto(e: Event) {
    const archivo = (e.target as HTMLInputElement).files?.[0];
    if (!archivo || !archivo.type.startsWith('image/')) return;
    const lector = new FileReader();
    lector.onload = () => this.eImagen.set(String(lector.result));
    lector.readAsDataURL(archivo);
  }

  /** Imagen provisional si falta un archivo de la carpeta img. */
  imagenFallida(e: Event) {
    const img = e.target as HTMLImageElement;
    if (img.dataset['provisional'] === 'true') return;
    img.dataset['provisional'] = 'true';
    img.src = IMAGEN_PROVISIONAL;
  }

  cerrarSesion(e: Event) {
    e.preventDefault();
    if (confirm('¿Cerrar sesión?')) this.router.navigate(['/login']);
  }
}
