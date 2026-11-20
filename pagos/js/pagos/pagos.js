
"use strict";

/* Utilidades */

const campo = id => document.getElementById(id);

const moneda = cantidad => new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN"
}).format(cantidad);

const normalizar = texto => String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/* Historial: búsqueda y filtros */

function filtrarPagos() {
    const tabla = campo("tabla-pagos");

    if (!tabla) return;

    const busqueda = normalizar(campo("buscar-pago")?.value ?? "");
    const metodo = campo("filtro-pagos")?.value ?? "todos";

    const filas = [...tabla.querySelectorAll("tr")];
    let visibles = 0;

    for (const fila of filas) {
        const coincideBusqueda = normalizar(fila.textContent)
            .includes(busqueda);

        const coincideMetodo = metodo === "todos"
            || fila.dataset.metodoId === metodo;

        const mostrar = coincideBusqueda && coincideMetodo;

        fila.hidden = !mostrar;

        if (mostrar) visibles++;
    }

    const mensaje = campo("sin-pagos");
    const contador = campo("contador-pagos");

    if (mensaje) mensaje.hidden = visibles > 0;

    if (contador) {
        contador.textContent = `Mostrando ${visibles} transacciones`;
    }
}

/* Selección del método de pago */

function actualizarMetodoPago() {
    const seleccionado = document.querySelector(
        'input[name="metodo-pago"]:checked'
    );

    const tipo = seleccionado?.dataset.tipo ?? "";

    document.querySelectorAll("[data-campos-metodo]").forEach(grupo => {
        grupo.hidden = grupo.dataset.camposMetodo !== tipo;
    });

    actualizarCambio();
}

/* Datos fiscales */

function actualizarFactura() {
    const requiere = campo("requiere-factura");
    const campos = campo("campos-factura");

    if (!requiere || !campos) return;

    campos.hidden = !requiere.checked;
}

/* Cálculo del cambio en efectivo */

function actualizarCambio() {
    const monto = campo("monto-pago");
    const recibido = campo("efectivo-recibido");
    const resultado = campo("cambio-efectivo");

    if (!monto || !recibido || !resultado) return;

    if (monto.value === "" || recibido.value === "") {
        resultado.textContent = "—";
        return;
    }

    const pago = Number(monto.value);
    const efectivo = Number(recibido.value);

    if (!Number.isFinite(pago) || !Number.isFinite(efectivo)) {
        resultado.textContent = "—";
        return;
    }

    resultado.textContent = moneda(efectivo - pago);
}

/* Conciliación del corte de caja */

function actualizarDiferencia() {
    const conteo = campo("conteo-real");
    const esperado = campo("efectivo-esperado");
    const resultado = campo("diferencia-caja");

    if (!conteo || !esperado || !resultado) return;

    const valorEsperado = esperado.dataset.valor;

    if (conteo.value === "" || valorEsperado === undefined) {
        resultado.textContent = "—";
        return;
    }

    const cantidad = Number(conteo.value);
    const totalEsperado = Number(valorEsperado);

    if (!Number.isFinite(cantidad) || !Number.isFinite(totalEsperado)) {
        resultado.textContent = "—";
        return;
    }

    resultado.textContent = moneda(cantidad - totalEsperado);
}

/* Ancho de la vista previa del ticket */

function actualizarPapelTicket() {
    const papel = campo("papel");
    const ticket = campo("ticket-imprimible");

    if (!papel || !ticket) return;

    ticket.classList.toggle("ticket-ancho-80", papel.value === "80");

    const titulo = document.getElementById("titulo-vista-ticket");

    if (titulo) {
        titulo.textContent = `Vista previa · ${papel.value} mm`;
    }
}

/* Eventos delegados: funcionan con HTML cargado dinámicamente */

document.addEventListener("input", evento => {
    switch (evento.target.id) {
        case "buscar-pago":
            filtrarPagos();
            break;

        case "monto-pago":
        case "efectivo-recibido":
            actualizarCambio();
            break;

        case "conteo-real":
            actualizarDiferencia();
            break;
    }
});

document.addEventListener("change", evento => {
    if (evento.target.name === "metodo-pago") {
        actualizarMetodoPago();
    }

    switch (evento.target.id) {
        case "filtro-pagos":
            filtrarPagos();
            break;

        case "requiere-factura":
            actualizarFactura();
            break;

        case "papel":
            actualizarPapelTicket();
            break;
    }
});
