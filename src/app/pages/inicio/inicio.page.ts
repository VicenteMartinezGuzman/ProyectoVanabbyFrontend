import { Component, ElementRef, OnDestroy, OnInit, ViewEncapsulation, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Carousel, Modal, Toast } from 'bootstrap';
import { BootstrapCssService } from '../../core/bootstrap-css.service';
import { FechaCortaPipe } from '../../core/fecha-actual.pipe';

interface ProductoDetalle {
  nombre: string;
  imagen: string;
  estado: string;
  precio: number;
  cantidad: string;
  tamano: string;
  bizcocho: string;
  relleno: string;
}

/** Datos provisionales para los detalles de los productos. */
const PRODUCTOS: Record<string, ProductoDetalle> = {
  'red-velvet': {
    nombre: 'Red Velvet', imagen: 'img/red-velvet-detalle.jpg', estado: 'Disponible', precio: 480,
    cantidad: '5 Piezas', tamano: 'Individual', bizcocho: 'Chocolate', relleno: 'Vainilla',
  },
  'chocolate-cupcake': {
    nombre: 'Chocolate Cupcake', imagen: 'img/chocolate-cupcake.jpg', estado: 'Por confirmar', precio: 550,
    cantidad: '—', tamano: '—', bizcocho: '—', relleno: '—',
  },
  'fruit-tarte': {
    nombre: 'Fruit Tarte', imagen: 'img/fruit-tarte.jpg', estado: 'Por confirmar', precio: 600,
    cantidad: '—', tamano: '—', bizcocho: '—', relleno: '—',
  },
};

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, FechaCortaPipe],
  templateUrl: './inicio.page.html',
  styleUrl: './inicio.page.css',
  encapsulation: ViewEncapsulation.None,
})
export class InicioPage implements OnInit, OnDestroy {
  private bs = inject(BootstrapCssService);
  private router = inject(Router);

  @ViewChild('modalProducto', { static: true }) modalEl!: ElementRef<HTMLElement>;
  @ViewChild('toastPedido', { static: true }) toastEl!: ElementRef<HTMLElement>;
  @ViewChild('carrusel', { static: true }) carruselEl!: ElementRef<HTMLElement>;

  private modal?: Modal;
  private toast?: Toast;
  private carrusel?: Carousel;

  hoy = new Date();
  claveActual = signal<string>('red-velvet');
  detalle = signal<ProductoDetalle>(PRODUCTOS['red-velvet']);
  mensaje = signal('');

  private formatoPrecio = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  precio(n: number) { return this.formatoPrecio.format(n); }

  ngOnInit() {
    this.bs.enable();
    this.modal = new Modal(this.modalEl.nativeElement);
    this.toast = new Toast(this.toastEl.nativeElement, { delay: 3000 });
    this.carrusel = new Carousel(this.carruselEl.nativeElement, { interval: false, touch: true });
  }

  ngOnDestroy() {
    this.modal?.dispose();
    this.toast?.dispose();
    this.carrusel?.dispose();
    this.bs.disable();
  }

  abrirDetalle(clave: string) {
    const p = PRODUCTOS[clave];
    if (!p) return;
    this.claveActual.set(clave);
    this.detalle.set(p);
    this.modal?.show();
  }

  agregarPedido(clave: string) {
    const p = PRODUCTOS[clave];
    if (!p) return;
    this.mensaje.set(`${p.nombre} seleccionado para el pedido (demostración).`);
    this.toast?.show();
  }

  agregarDesdeDetalle() {
    this.agregarPedido(this.claveActual());
    this.modal?.hide();
  }

  prev() { this.carrusel?.prev(); }
  next() { this.carrusel?.next(); }

  /** "Ver más" aún no tiene interfaz: se evita la navegación como en el original. */
  pendiente(e: Event) { e.preventDefault(); }

  cerrarSesion(e: Event) {
    e.preventDefault();
    this.router.navigateByUrl('/login');
  }
}
