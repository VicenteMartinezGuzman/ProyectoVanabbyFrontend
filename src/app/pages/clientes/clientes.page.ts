import { Component, ElementRef, OnDestroy, ViewChild, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { BootstrapCssService } from '../../core/bootstrap-css.service';

interface ClienteFila {
  id: string; tipo: 'pf' | 'pm'; nombre: string; rfc: string; telefono: string; domicilio: string; archivo: string;
}
type ModalId = 'nuevo' | 'editar' | 'eliminar';

const SIN_ARCHIVO = 'Ningún archivo seleccionado';

@Component({
  selector: 'app-clientes',
  imports: [FormsModule, RouterLink],
  templateUrl: './clientes.page.html',
  styleUrl: './clientes.page.css',
  encapsulation: ViewEncapsulation.None,
})
export class ClientesPage implements OnDestroy {
  private bs = inject(BootstrapCssService);
  private router = inject(Router);

  @ViewChild('modalNuevo') modalNuevoRef!: ElementRef<HTMLElement>;
  @ViewChild('modalEditar') modalEditarRef!: ElementRef<HTMLElement>;
  @ViewChild('modalEliminar') modalEliminarRef!: ElementRef<HTMLElement>;

  readonly clientes: ClienteFila[] = [
    { id: '001', tipo: 'pf', nombre: 'Ana García Morales', rfc: 'GAMA900101AA1', telefono: '951 300 4001', domicilio: 'Calle Reforma 101, Centro, Oaxaca de Juárez', archivo: 'Recibo_CFE_Ana.pdf' },
    { id: '002', tipo: 'pf', nombre: 'Beatriz Gómez Cruz', rfc: 'GOCB910512BB2', telefono: '951 300 4002', domicilio: 'Calle Murguía 77, Centro, Oaxaca de Juárez', archivo: 'Recibo_CFE_Beatriz.pdf' },
    { id: '003', tipo: 'pf', nombre: 'Laura Gómez Ruiz', rfc: 'GORL920303CC3', telefono: '951 300 4003', domicilio: 'Privada Gardenias 18, Reforma, Oaxaca de Juárez', archivo: 'Recibo_CFE_Laura.pdf' },
    { id: '004', tipo: 'pf', nombre: 'Miguel Ángel Castro', rfc: 'CAMM880202DD4', telefono: '951 300 4004', domicilio: 'Av. Universidad 220, Cinco Señores, Oaxaca de Juárez', archivo: 'Recibo_CFE_Miguel.pdf' },
    { id: '005', tipo: 'pf', nombre: 'Daniela Ruiz López', rfc: 'RULD950615EE5', telefono: '951 300 4005', domicilio: 'Calle Magnolia 42, Volcanes, Oaxaca de Juárez', archivo: 'Recibo_CFE_Daniela.pdf' },
  ];

  readonly hoy = new Date();
  readonly fechaISO = [
    this.hoy.getFullYear(),
    String(this.hoy.getMonth() + 1).padStart(2, '0'),
    String(this.hoy.getDate()).padStart(2, '0'),
  ].join('-');
  readonly fechaTexto = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(this.hoy);

  readonly totalPf = this.clientes.filter((c) => c.tipo === 'pf').length;
  readonly totalPm = this.clientes.filter((c) => c.tipo === 'pm').length;

  // Búsqueda y filtros
  busqueda = signal('');
  filtro = signal<'todos' | 'pf' | 'pm'>('todos');
  visibles = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const f = this.filtro();
    return this.clientes.filter((c) => {
      const tipoOk = f === 'todos' || c.tipo === f;
      const info = [c.nombre, c.rfc, c.telefono, c.domicilio].join(' ').toLowerCase();
      return tipoOk && info.includes(q);
    });
  });

  // Nuevo cliente
  personaMoral = signal(false);
  nuevo = this.nuevoVacio();
  nuevoArchivo = signal(SIN_ARCHIVO);

  // Editar
  editar = { nombre: '', rfc: '', telefono: '', fecha: '' };
  editarDomicilio = '';
  editarArchivoActual = '';
  editarArchivoNuevo = signal(SIN_ARCHIVO);
  @ViewChild('editarPdf') editarPdf?: ElementRef<HTMLInputElement>;

  // Eliminar
  eliminando = signal<ClienteFila | null>(null);

  constructor() { this.bs.enable(); }
  ngOnDestroy() {
    this.bs.disable();
    for (const r of [this.modalNuevoRef, this.modalEditarRef, this.modalEliminarRef]) {
      if (r) Modal.getInstance(r.nativeElement)?.dispose();
    }
  }

  private nuevoVacio() {
    return { nombre: '', comercial: '', paterno: '', materno: '', razon: '', rfc: '', telefono: '', fecha: this.fechaISO };
  }

  cerrarSesion(ev: Event) {
    ev.preventDefault();
    if (confirm('¿Deseas cerrar sesión?')) this.router.navigate(['/login']);
  }

  setFiltro(f: 'todos' | 'pf' | 'pm') { this.filtro.set(f); }

  // ---------- modales ----------
  private ref(m: ModalId): ElementRef<HTMLElement> {
    return m === 'nuevo' ? this.modalNuevoRef : m === 'editar' ? this.modalEditarRef : this.modalEliminarRef;
  }
  abrir(m: ModalId) { Modal.getOrCreateInstance(this.ref(m).nativeElement).show(); }
  cerrar(m: ModalId) { Modal.getOrCreateInstance(this.ref(m).nativeElement).hide(); }

  abrirEditar(c: ClienteFila) {
    this.editar = { nombre: c.nombre, rfc: c.rfc, telefono: c.telefono, fecha: '' };
    this.editarDomicilio = c.domicilio;
    this.editarArchivoActual = c.archivo;
    if (this.editarPdf) this.editarPdf.nativeElement.value = '';
    this.editarArchivoNuevo.set(SIN_ARCHIVO);
    this.abrir('editar');
  }
  abrirEliminar(c: ClienteFila) { this.eliminando.set(c); this.abrir('eliminar'); }

  // ---------- formulario nuevo ----------
  limpiarNuevo(pdf: HTMLInputElement) {
    this.nuevo = this.nuevoVacio();
    this.personaMoral.set(false);
    pdf.value = '';
    this.nuevoArchivo.set(SIN_ARCHIVO);
  }
  elegirArchivo(ev: Event, destino: 'nuevo' | 'editar') {
    const nombre = (ev.target as HTMLInputElement).files?.[0]?.name || SIN_ARCHIVO;
    (destino === 'nuevo' ? this.nuevoArchivo : this.editarArchivoNuevo).set(nombre);
  }
}
