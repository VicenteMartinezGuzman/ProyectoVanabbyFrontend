
"use strict";

// Mostrar la fecha actual del sistema.

function mostrar_fecha_actual() {
    const elemento_fecha = document.getElementById("fecha-actual");

    if (!elemento_fecha) {
        return;
    }

    const fecha_actual = new Date();

    const formato_fecha = new Intl.DateTimeFormat("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

    const anio = fecha_actual.getFullYear();
    const mes = String(fecha_actual.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha_actual.getDate()).padStart(2, "0");

    elemento_fecha.dateTime = `${anio}-${mes}-${dia}`;
    elemento_fecha.textContent = formato_fecha.format(fecha_actual);
}

// Inicializar los elementos compartidos.

function iniciar_estructura() {
    mostrar_fecha_actual();
}

document.addEventListener("DOMContentLoaded", iniciar_estructura);
