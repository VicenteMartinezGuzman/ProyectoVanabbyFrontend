
"use strict";

/* Archivos disponibles */

const vistas = [
    "control",
    "nuevo",
    "exito",
    "corte",
    "cerrada"
];

const modales = [
    "exportar",
    "factura",
    "ticket",
    "reporte"
];

/* Contenedores */

const contenedorVistas = document.getElementById("contenedor-vistas");
const contenedorModales = document.getElementById("contenedor-modales");

/* Lectura de archivos HTML */

async function obtenerHTML(ruta) {
    const respuesta = await fetch(ruta);

    if (!respuesta.ok) {
        throw new Error(`No se pudo cargar: ${ruta}`);
    }

    return respuesta.text();
}

/* Navegación entre vistas */

async function cargarVista(nombre) {
    if (!vistas.includes(nombre)) {
        console.error(`Vista no reconocida: ${nombre}`);
        return;
    }

    try {
        const html = await obtenerHTML(`vistas/${nombre}.html`);
        contenedorVistas.innerHTML = html;
    } catch (error) {
        console.error(error);
        contenedorVistas.textContent = "No se pudo cargar la vista.";
    }
}

/* Carga de los modales */

async function cargarModales() {
    for (const nombre of modales) {
        try {
            const html = await obtenerHTML(`modales/${nombre}.html`);
            contenedorModales.insertAdjacentHTML("beforeend", html);
        } catch (error) {
            console.error(error);
        }
    }
}

/* Apertura y cierre */

function abrirModal(nombre) {
    const modal = document.getElementById(`modal-${nombre}`);

    if (!modal) {
        console.error(`Modal no encontrado: ${nombre}`);
        return;
    }

    modal.hidden = false;
    modal.querySelector(".cerrar-modal")?.focus();
}

function cerrarModales() {
    contenedorModales
        .querySelectorAll(".modal-pagos")
        .forEach(modal => {
            modal.hidden = true;
        });
}

/* Eventos de navegación */

document.addEventListener("click", evento => {
    const botonVista = evento.target.closest("[data-ir]");

    if (botonVista) {
        cargarVista(botonVista.dataset.ir);
        return;
    }

    const botonModal = evento.target.closest("[data-modal]");

    if (botonModal) {
        abrirModal(botonModal.dataset.modal);
        return;
    }

    if (evento.target.closest("[data-cerrar-modal]")) {
        cerrarModales();
    }
});

/* Cerrar modales con Escape */

document.addEventListener("keydown", evento => {
    if (evento.key === "Escape") {
        cerrarModales();
    }
});

/* Evitar envíos sin lógica implementada */

document.addEventListener("submit", evento => {
    if (evento.target.id === "formulario-pago") {
        evento.preventDefault();

        const mensaje = document.getElementById("mensaje-pago");

        if (mensaje) {
            mensaje.hidden = false;
            mensaje.textContent =
                "El registro de pagos todavía no está conectado al backend.";
        }
    }

    if (evento.target.id === "formulario-exportar") {
        evento.preventDefault();

        const mensaje = document.getElementById("mensaje-exportacion");

        if (mensaje) {
            mensaje.hidden = false;
            mensaje.textContent =
                "La generación del reporte está pendiente de implementación.";
        }
    }
});

/* Inicialización */

async function iniciarPagos() {
    await cargarModales();
    await cargarVista("control");
}

iniciarPagos();
