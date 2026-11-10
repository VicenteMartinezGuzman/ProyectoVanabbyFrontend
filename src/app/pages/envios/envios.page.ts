import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { BootstrapCssService } from '../../core/bootstrap-css.service';

type EstadoEnvio = 'Pendiente' | 'En camino' | 'Entregado';
type Vista = 'listado' | 'detalle' | 'formulario';

interface Envio {
  id: string;
  cliente: string;
  direccion: string;
  telefono: string;
  repartidor: string;
  fecha: string;
  hora: string;
  estado: EstadoEnvio;
  observaciones: string;
}

const FORMATO_FECHA = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

function formatearFecha(fecha: string | Date): string {
  if (fecha instanceof Date) return FORMATO_FECHA.format(fecha);
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return FORMATO_FECHA.format(new Date(anio, mes - 1, dia));
}

function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

@Component({
  selector: 'app-envios',
  imports: [FormsModule, RouterLink],
  templateUrl: './envios.page.html',
  styleUrl: './envios.page.css',
  encapsulation: ViewEncapsulation.None,
})
export class EnviosPage implements AfterViewInit, OnDestroy {
  private bootstrapCss = inject(BootstrapCssService);
  private router = inject(Router);

  @ViewChild('modalEstado', { static: true }) modalEstadoRef!: ElementRef<HTMLElement>;
  private modalEstado?: Modal;

  readonly clasesEstado: Record<EstadoEnvio, string> = {
    'Pendiente': 'estado-pendiente',
    'En camino': 'estado-camino',
    'Entregado': 'estado-entregado',
  };
  readonly repartidores = ['Laura Ramírez', 'José Ramírez', 'María López'];
  readonly estados: EstadoEnvio[] = ['Pendiente', 'En camino', 'Entregado'];

  readonly envios: Envio[] = [
    { id: 'PED-1048', cliente: 'María González', direccion: 'Calle Morelos 123, Centro', telefono: '951 123 4567', repartidor: 'Laura Ramírez', fecha: '2026-10-13', hora: '17:30', estado: 'Pendiente', observaciones: 'Entregar en portón azul' },
    { id: 'PED-1047', cliente: 'Carlos Méndez', direccion: 'Av. Juárez 45, Reforma', telefono: '951 234 5678', repartidor: 'José Ramírez', fecha: '2026-10-13', hora: '16:00', estado: 'Pendiente', observaciones: 'Llamar antes de entregar' },
    { id: 'PED-1046', cliente: 'Ana Torres', direccion: 'Col. Centro, Oaxaca', telefono: '951 345 6789', repartidor: 'María López', fecha: '2026-10-12', hora: '15:30', estado: 'En camino', observaciones: 'Recibe en la entrada principal' },
    { id: 'PED-1045', cliente: 'Laura Sánchez', direccion: 'Calle Hidalgo 210', telefono: '951 456 7890', repartidor: 'Laura Ramírez', fecha: '2026-10-12', hora: '13:00', estado: 'Entregado', observaciones: 'Entregado en recepción' },
    { id: 'PED-1044', cliente: 'Jorge Ramírez', direccion: 'Priv. Bugambilias 18', telefono: '951 567 8901', repartidor: 'José Ramírez', fecha: '2026-10-12', hora: '12:00', estado: 'Entregado', observaciones: 'Sin observaciones' },
    { id: 'PED-1043', cliente: 'Sofía Herrera', direccion: 'Av. Universidad 55', telefono: '951 678 9012', repartidor: 'María López', fecha: '2026-10-11', hora: '18:00', estado: 'En camino', observaciones: 'Entregar a la persona encargada' },
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
  seleccionado = signal<Envio>(this.envios[0]);

  visibles = computed(() => {
    const q = normalizarTexto(this.busqueda());
    return this.envios.filter((e) => normalizarTexto(`${e.id} ${e.cliente}`).includes(q));
  });
  contador = computed(() =>
    this.busqueda() ? `Mostrando ${this.visibles().length} de 6 envíos de ejemplo` : 'Mostrando 1–6 de 45 envíos',
  );

  // Formulario compartido de registro y edición
  editando = signal(false);
  formPedido = this.envios[0].id;
  formCliente = '';
  formDireccion = '';
  formTelefono = '';
  formFecha = '';
  formHora = '';
  formRepartidor = this.repartidores[0];
  formObservaciones = '';

  // Modal de estado
  nuevoEstado: EstadoEnvio = 'Entregado';
  notasEstado = '';

  constructor() {
    this.bootstrapCss.enable();
  }

  ngAfterViewInit(): void {
    this.modalEstado = Modal.getOrCreateInstance(this.modalEstadoRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.modalEstado?.dispose();
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ver(envio?: Envio) {
    if (envio) this.seleccionado.set(envio);
    this.mostrarVista('detalle');
  }

  abrirFormulario(modo: 'registrar' | 'editar', envio?: Envio) {
    if (envio) this.seleccionado.set(envio);
    const editar = modo === 'editar';
    if (!editar) this.seleccionado.set(this.envios[0]);
    this.editando.set(editar);
    this.llenarFormulario(this.seleccionado());
    this.mostrarVista('formulario');
  }

  private llenarFormulario(e: Envio) {
    this.formPedido = e.id;
    this.formCliente = e.cliente;
    this.formDireccion = e.direccion;
    this.formTelefono = e.telefono;
    this.formFecha = e.fecha;
    this.formHora = e.hora;
    this.formRepartidor = e.repartidor;
    this.formObservaciones = e.observaciones;
  }

  cambiarPedido(id: string) {
    const fila = this.envios.find((e) => e.id === id);
    if (fila) {
      this.seleccionado.set(fila);
      this.llenarFormulario(fila);
    }
  }

  abrirEstado(envio?: Envio) {
    if (envio) this.seleccionado.set(envio);
    this.nuevoEstado = 'Entregado';
    this.notasEstado = '';
    this.modalEstado?.show();
  }

  // El original es una demostración visual: los formularios no guardan datos.
  guardarEstado() { this.modalEstado?.hide(); }
}
