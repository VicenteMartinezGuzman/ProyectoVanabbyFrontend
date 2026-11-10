import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { BootstrapCssService } from '../../core/bootstrap-css.service';

type EstadoInsumo = 'Disponible' | 'Bajo' | 'Crítico';
type Vista = 'listado' | 'detalle' | 'formulario';

interface Insumo {
  nombre: string;
  categoria: string;
  existencia: number;
  unidad: string;
  minimo: number;
  caducidad: string;
  estado: EstadoInsumo;
}

const FORMATO_FECHA = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

function formatearFecha(fecha: string | Date | null | undefined): string {
  if (!fecha) return 'No registrada';
  if (fecha instanceof Date) return FORMATO_FECHA.format(fecha);
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return FORMATO_FECHA.format(new Date(anio, mes - 1, dia));
}

function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

@Component({
  selector: 'app-almacen',
  imports: [FormsModule, RouterLink],
  templateUrl: './almacen.page.html',
  styleUrl: './almacen.page.css',
  encapsulation: ViewEncapsulation.None,
})
export class AlmacenPage implements AfterViewInit, OnDestroy {
  private bootstrapCss = inject(BootstrapCssService);
  private router = inject(Router);

  @ViewChild('modalEliminar', { static: true }) modalEliminarRef!: ElementRef<HTMLElement>;
  private modalEliminar?: Modal;

  readonly estilosEstado: Record<EstadoInsumo, string> = {
    'Disponible': 'estado-disponible',
    'Bajo': 'estado-bajo',
    'Crítico': 'estado-critico',
  };
  readonly categorias = ['Harinas', 'Endulzantes', 'Lácteos', 'Huevos', 'Chocolates', 'Esencias', 'Otros'];
  readonly unidades = [
    { valor: 'kg', texto: 'Kilogramos (kg)' },
    { valor: 'g', texto: 'Gramos (g)' },
    { valor: 'L', texto: 'Litros (L)' },
    { valor: 'ml', texto: 'Mililitros (ml)' },
    { valor: 'pzas', texto: 'Piezas (pzas)' },
  ];

  readonly insumos: Insumo[] = [
    { nombre: 'Harina de trigo', categoria: 'Harinas', existencia: 25, unidad: 'kg', minimo: 5, caducidad: '2026-11-15', estado: 'Disponible' },
    { nombre: 'Azúcar refinada', categoria: 'Endulzantes', existencia: 4, unidad: 'kg', minimo: 5, caducidad: '2027-03-20', estado: 'Bajo' },
    { nombre: 'Mantequilla sin sal', categoria: 'Lácteos', existencia: 2, unidad: 'kg', minimo: 5, caducidad: '2026-11-02', estado: 'Crítico' },
    { nombre: 'Huevos', categoria: 'Huevos', existencia: 36, unidad: 'pzas', minimo: 12, caducidad: '2026-11-05', estado: 'Disponible' },
    { nombre: 'Cacao en polvo', categoria: 'Chocolates', existencia: 3, unidad: 'kg', minimo: 5, caducidad: '2027-06-01', estado: 'Bajo' },
    { nombre: 'Vainilla', categoria: 'Esencias', existencia: 250, unidad: 'ml', minimo: 100, caducidad: '2027-09-01', estado: 'Disponible' },
  ];

  readonly hoy = new Date();
  readonly fechaISO = [
    this.hoy.getFullYear(),
    String(this.hoy.getMonth() + 1).padStart(2, '0'),
    String(this.hoy.getDate()).padStart(2, '0'),
  ].join('-');
  readonly fechaActual = formatearFecha(this.fechaISO);

  vista = signal<Vista>('listado');
  busqueda = signal('');
  seleccionado = signal<Insumo>(this.insumos[0]);

  visibles = computed(() => {
    const q = normalizarTexto(this.busqueda());
    return this.insumos.filter((i) => normalizarTexto(`${i.nombre} ${i.categoria}`).includes(q));
  });
  contador = computed(() =>
    this.busqueda()
      ? `Mostrando ${this.visibles().length} de ${this.insumos.length} insumos de ejemplo`
      : 'Mostrando 1–6 de 248 insumos',
  );

  // Formulario compartido de agregar / editar
  editando = signal(false);
  formNombre = '';
  formCategoria = '';
  formCantidad: number | null = null;
  formUnidad = '';
  formMinimo: number | null = null;
  formCaducidad = '';

  constructor() {
    this.bootstrapCss.enable();
  }

  ngAfterViewInit(): void {
    this.modalEliminar = Modal.getOrCreateInstance(this.modalEliminarRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.modalEliminar?.dispose();
    document.querySelectorAll('.modal-backdrop').forEach((b) => b.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    this.bootstrapCss.disable();
  }

  formatearFecha = formatearFecha;

  cerrarSesion(ev: Event) {
    ev.preventDefault();
    if (confirm('¿Deseas cerrar sesión?')) this.router.navigate(['/login']);
  }

  mostrarVista(nombre: Vista) {
    this.vista.set(nombre);
    window.scrollTo(0, 0);
  }

  ver(insumo?: Insumo) {
    if (insumo) this.seleccionado.set(insumo);
    this.mostrarVista('detalle');
  }

  abrirFormulario(modo: 'agregar' | 'editar', insumo?: Insumo) {
    if (insumo) this.seleccionado.set(insumo);
    const editar = modo === 'editar';
    this.editando.set(editar);
    const i = this.seleccionado();
    // formularioInsumo.reset() y, al editar, rellenar con el insumo seleccionado
    this.formNombre = editar ? i.nombre : '';
    this.formCategoria = editar ? i.categoria : '';
    this.formCantidad = editar ? i.existencia : null;
    this.formUnidad = editar ? i.unidad : '';
    this.formMinimo = editar ? i.minimo : null;
    this.formCaducidad = editar ? i.caducidad : '';
    this.mostrarVista('formulario');
  }

  abrirEliminar(insumo: Insumo) {
    this.seleccionado.set(insumo);
    this.modalEliminar?.show();
  }

  // El original es una demostración visual: eliminar/guardar no modifican los datos.
  confirmarEliminar() { this.modalEliminar?.hide(); }
}
