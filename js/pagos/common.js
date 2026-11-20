/* ===== VANABBY · Utilidades compartidas =====
   Se carga en TODAS las pantallas (antes del script propio de cada página).
   Reúne lo que antes estaba copiado en cada archivo: formato de fechas y
   moneda, escape de HTML, normalización de texto, cambio de vistas,
   filtrado de tablas, almacenamiento local, modales y avisos. */
const Vanabby = (() => {
  "use strict";

  const PREFIJO_ALMACEN = "vanabby:";
  const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const ENTIDADES_HTML = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const SELECTOR_FOCO = "[autofocus], input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])";

  const formatoFechaMx = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  const formatosMoneda = new Map();
  const focoAnterior = new WeakMap();

  /* ---------- DOM y texto ---------- */

  const $ = (id) => document.getElementById(id);

  /* Escapa texto antes de insertarlo con innerHTML (evita inyección de HTML). */
  function escapar(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) => ENTIDADES_HTML[c]);
  }

  /* Minúsculas, sin acentos y sin espacios sobrantes: para búsquedas. */
  function normalizar(texto) {
    return String(texto ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  /* Asigna textContent a varios elementos: { idElemento: "campoDelDataset" }. */
  function rellenarTextos(mapa, datos, vacio = "—") {
    for (const [id, campo] of Object.entries(mapa)) {
      const el = $(id);
      if (el) el.textContent = datos[campo] ?? vacio;
    }
  }

  /* Igual que rellenarTextos, pero para campos de formulario (value). */
  function rellenarCampos(mapa, datos) {
    for (const [id, campo] of Object.entries(mapa)) {
      const el = $(id);
      if (el) el.value = datos[campo] ?? "";
    }
  }

  /* Muestra una sola vista: las demás (clase) se ocultan con d-none. */
  function cambiarVista(clase, nombre, { suave = true } = {}) {
    document.querySelectorAll(`.${clase}`).forEach((vista) => {
      vista.classList.toggle("d-none", vista.id !== `vista-${nombre}`);
    });
    window.scrollTo({ top: 0, behavior: suave ? "smooth" : "auto" });
  }

  /* Oculta/muestra filas según un predicado y devuelve cuántas quedaron visibles. */
  function filtrarFilas(filas, predicado) {
    let visibles = 0;
    filas.forEach((fila) => {
      const coincide = Boolean(predicado(fila));
      fila.hidden = !coincide;
      if (coincide) visibles++;
    });
    return visibles;
  }

  /* Los formularios son demostraciones visuales: no deben recargar la página. */
  function bloquearEnvios(excluir = null) {
    document.querySelectorAll("form").forEach((formulario) => {
      if (formulario === excluir) return;
      formulario.addEventListener("submit", (evento) => evento.preventDefault());
    });
  }

  /* ---------- Fechas ---------- */

  const dosDigitos = (n) => String(n).padStart(2, "0");

  /* Fecha LOCAL en formato AAAA-MM-DD (toISOString() usa UTC y adelanta el día por la tarde). */
  function fechaISO(fecha = new Date()) {
    return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
  }

  /* Convierte AAAA-MM-DD en Date local (o null si no es válida). */
  function fechaDesdeISO(iso) {
    const [anio, mes, dia] = String(iso ?? "").split("-").map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  /* "13 Oct 2026" */
  function fechaCorta(fecha = new Date()) {
    return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
  }

  function fechaCortaISO(iso, vacio = "—") {
    const fecha = fechaDesdeISO(iso);
    return fecha ? fechaCorta(fecha) : vacio;
  }

  /* "13 oct 2026" */
  function fechaLegibleISO(iso, vacio = "No registrada") {
    const fecha = fechaDesdeISO(iso);
    return fecha ? formatoFechaMx.format(fecha) : vacio;
  }

  /* ---------- Moneda ---------- */

  function moneda(cantidad, decimales = 2) {
    if (!formatosMoneda.has(decimales)) {
      formatosMoneda.set(decimales, new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
      }));
    }
    const valor = Number(cantidad);
    /* Number.isFinite evita "NaN"; "!== 0" evita el "-$0.00" que produce -0. */
    return formatosMoneda.get(decimales).format(Number.isFinite(valor) && valor !== 0 ? valor : 0);
  }

  /* ---------- Almacenamiento local ---------- */

  function guardar(clave, valor) {
    try {
      localStorage.setItem(PREFIJO_ALMACEN + clave, JSON.stringify(valor));
      return true;
    } catch {
      return false; // sin almacenamiento disponible (modo privado, cuota llena)
    }
  }

  /* esValido descarta datos dañados o con otra forma (p. ej. exige un arreglo). */
  function cargar(clave, porDefecto, esValido = () => true) {
    try {
      const crudo = localStorage.getItem(PREFIJO_ALMACEN + clave);
      if (crudo === null) return porDefecto;
      const valor = JSON.parse(crudo);
      return esValido(valor) ? valor : porDefecto;
    } catch {
      return porDefecto;
    }
  }

  /* ---------- Modales propios (los de Bootstrap usan su API) ---------- */

  function abrirModal(id) {
    const modal = $(id);
    if (!modal) return;
    focoAnterior.set(modal, document.activeElement);
    modal.hidden = false;
    modal.querySelector(SELECTOR_FOCO)?.focus();
  }

  function cerrarElemento(modal) {
    if (modal.hidden) return;
    modal.hidden = true;
    const previo = focoAnterior.get(modal);
    if (previo && previo.isConnected) previo.focus();
    focoAnterior.delete(modal);
  }

  function cerrarModal(id) {
    const modal = $(id);
    if (modal) cerrarElemento(modal);
  }

  /* ---------- Avisos ---------- */

  /* Las pantallas con Bootstrap no tienen los estilos .toast propios (en Bootstrap
     .toast está oculto por defecto), así que ahí el aviso lleva estilos en línea. */
  const usaBootstrap = () => Boolean(document.querySelector('link[href*="bootstrap"], script[src*="bootstrap"]'));
  const COLORES_AVISO = { ok: "#198754", error: "#dc3545", "": "#212529" };

  function toast(mensaje, tipo = "") {
    let contenedor = $("toasts");
    if (!contenedor) {
      contenedor = document.createElement("div");
      contenedor.id = "toasts";
      contenedor.setAttribute("role", "status");
      contenedor.setAttribute("aria-live", "polite");
      if (usaBootstrap()) {
        contenedor.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:2000;display:flex;flex-direction:column;gap:8px;max-width:360px";
      }
      document.body.appendChild(contenedor);
    }
    const aviso = document.createElement("div");
    aviso.textContent = mensaje;
    if (usaBootstrap()) {
      aviso.style.cssText = `padding:.75rem 1rem;border-radius:.5rem;color:#fff;font-size:.9rem;box-shadow:0 .5rem 1rem rgba(0,0,0,.2);background:${COLORES_AVISO[tipo] ?? COLORES_AVISO[""]}`;
    } else {
      aviso.className = `toast ${tipo}`.trim();
    }
    contenedor.appendChild(aviso);
    setTimeout(() => aviso.remove(), 3500);
  }

  /* Descarga un archivo de texto generado en el navegador (CSV, XML, etc.). */
  function descargarTexto(nombre, contenido, tipo = "text/plain") {
    const url = URL.createObjectURL(new Blob(["\ufeff", contenido], { type: `${tipo};charset=utf-8` }));
    const enlace = Object.assign(document.createElement("a"), { href: url, download: nombre });
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* Convierte filas (arreglo de arreglos) en CSV; neutraliza fórmulas de Excel. */
  function aCSV(filas) {
    const celda = (c) => {
      const texto = String(c ?? "");
      return `"${(/^[=+\-@\t\r]/.test(texto) ? "'" + texto : texto).replace(/"/g, '""')}"`;
    };
    return filas.map((f) => f.map(celda).join(",")).join("\n");
  }

  /* Cierra un modal de Bootstrap (si Bootstrap cargó). */
  function cerrarModalBootstrap(elemento) {
    if (typeof bootstrap !== "undefined" && elemento) bootstrap.Modal.getInstance(elemento)?.hide();
  }

  /* ---------- Imagen provisional cuando falta un archivo de /img ---------- */

  function activarImagenProvisional() {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 250">
        <rect width="600" height="250" fill="#f0edf6"/>
        <text x="300" y="115" text-anchor="middle" font-family="Arial" font-size="22" fill="#673ab7">Repostería Vanabby</text>
        <text x="300" y="150" text-anchor="middle" font-family="Arial" font-size="16" fill="#777">Imagen pendiente</text>
      </svg>`;
    const ruta = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

    const sustituir = (imagen) => {
      if (imagen.dataset.provisional === "true") return; // evita un bucle si el reemplazo fallara
      imagen.dataset.provisional = "true";
      imagen.src = ruta;
    };

    /* Fallos futuros (el evento "error" no burbujea: se escucha en captura)… */
    document.addEventListener("error", (evento) => {
      if (evento.target instanceof HTMLImageElement) sustituir(evento.target);
    }, true);

    /* …y fallos que ocurrieron antes de que se registrara el escuchador. */
    document.querySelectorAll("img[src]").forEach((imagen) => {
      if (imagen.complete && imagen.naturalWidth === 0) sustituir(imagen);
    });
  }

  /* ---------- QR ilustrativo (no funcional), generado con una semilla ---------- */

  function qr(semilla = "VANABBY", tam = 21) {
    let estado = 0;
    for (const c of semilla) estado = (estado * 31 + c.charCodeAt(0)) >>> 0;
    const aleatorio = () => ((estado = (estado * 1664525 + 1013904223) >>> 0) / 4294967296);

    const px = 4;
    const limite = tam - 7;
    let rectas = "";

    for (let y = 0; y < tam; y++) {
      for (let x = 0; x < tam; x++) {
        const esquina = (x < 7 && y < 7) || (x >= limite && y < 7) || (x < 7 && y >= limite);
        let encendido;
        if (esquina) {
          /* Posición dentro del cuadro localizador de 7×7. */
          const bx = x >= limite ? x - limite : x;
          const by = y >= limite ? y - limite : y;
          encendido = bx === 0 || bx === 6 || by === 0 || by === 6 || (bx >= 2 && bx <= 4 && by >= 2 && by <= 4);
        } else {
          encendido = aleatorio() > 0.5;
        }
        if (encendido) rectas += `<rect x="${x * px}" y="${y * px}" width="${px}" height="${px}"/>`;
      }
    }
    const lado = tam * px;
    return `<svg viewBox="0 0 ${lado} ${lado}" width="96" height="96" fill="#111" shape-rendering="crispEdges" role="img" aria-label="Código QR ilustrativo">${rectas}</svg>`;
  }

  /* ---------- Inicio común ---------- */

  function pintarFechaActual() {
    const hoy = new Date();

    /* Pantallas con estilos propios (compras, pedidos, monitoreo). */
    const corta = $("fechaActual");
    if (corta) {
      corta.dateTime = fechaISO(hoy);
      corta.textContent = fechaCorta(hoy);
    }

    /* Pantallas con Bootstrap. */
    const legible = $("fecha-actual");
    if (legible) {
      legible.dateTime = fechaISO(hoy);
      legible.textContent = formatoFechaMx.format(hoy);
    }
  }

  function init() {
    pintarFechaActual();

    const salir = $("btnSalir");
    if (salir) {
      salir.addEventListener("click", () => {
        if (confirm("¿Deseas cerrar sesión?")) location.href = "login.html";
      });
    }

    /* Cierre de modales: botón [data-close], clic en el fondo y tecla Esc */
    document.addEventListener("click", (e) => {
      const cerrar = e.target.closest("[data-close]");
      if (cerrar) cerrarModal(cerrar.dataset.close);
      if (e.target.classList.contains("modal-overlay")) cerrarElemento(e.target);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal-overlay:not([hidden])").forEach(cerrarElemento);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  return {
    meses: MESES,
    $, escapar, normalizar, rellenarTextos, rellenarCampos,
    cambiarVista, filtrarFilas, bloquearEnvios,
    fechaISO, fechaDesdeISO, fechaCorta, fechaCortaISO, fechaLegibleISO,
    moneda, guardar, cargar,
    abrirModal, cerrarModal, cerrarModalBootstrap, toast, descargarTexto, aCSV,
    activarImagenProvisional, qr,
  };
})();
