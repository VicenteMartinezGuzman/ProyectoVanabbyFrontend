
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const obtener = (id) => document.getElementById(id);

    let envio_seleccionado = null;

    // Utilidades.

    function texto(valor, alternativa = "No registrado") {
        return valor === null ||
            valor === undefined ||
            valor === ""
            ? alternativa
            : String(valor);
    }

    function moneda(valor) {
        if (valor === null || valor === undefined || valor === "") {
            return "No registrado";
        }

        return new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN"
        }).format(Number(valor));
    }

    function fecha_formulario(valor) {
        if (!valor) return "";

        return String(valor)
            .replace(" ", "T")
            .slice(0, 16);
    }

    // Cargar las tres vistas HTML.

    const contenedor_vistas = obtener("contenedor-vistas");

    for (const vista of ["listado", "detalle", "formulario"]) {
        try {
            const respuesta = await fetch(
                `./vistas/${vista}.html`
            );

            if (!respuesta.ok) {
                throw new Error(
                    `No se pudo cargar la vista: ${vista}`
                );
            }

            contenedor_vistas.insertAdjacentHTML(
                "beforeend",
                await respuesta.text()
            );

        } catch (error) {
            console.error(error);
            contenedor_vistas.textContent = error.message;
            return;
        }
    }

    // Conservar el modal de actualización de estado.

    try {
        const respuesta = await fetch(
            "./modales/actualizar-estado.html"
        );

        if (!respuesta.ok) {
            throw new Error(
                "No se pudo cargar el modal de estado."
            );
        }

        obtener("contenedor-modales").innerHTML =
            await respuesta.text();

    } catch (error) {
        console.error(error);
    }

    // Lectura de los atributos del envío seleccionado.

    function datos_envio() {
        if (!envio_seleccionado) {
            return null;
        }

        const datos = envio_seleccionado.dataset;

        return {
            envio_id: datos.envioId ?? "",
            pedido_id: datos.pedidoId ?? "",
            direccion_id: datos.direccionId ?? "",
            empleado_id: datos.empleadoId ?? "",
            costo_envio: datos.costoEnvio ?? "",
            fecha_salida: datos.fechaSalida ?? "",
            fecha_entrega_real: datos.fechaEntregaReal ?? "",
            notas: datos.notas ?? "",

            // Información obtenida mediante relaciones.
            cliente: datos.cliente ?? "",
            telefono: datos.telefono ?? "",
            direccion: datos.direccion ?? "",
            empleado: datos.empleado ?? "",

            // Dato provisional del modal recuperado.
            estado: datos.estado ?? ""
        };
    }

    // Navegación entre las tres vistas.

    function mostrar_vista(nombre) {
        document.querySelectorAll(".vista-envios").forEach(
            (vista) => {
                vista.hidden =
                    vista.id !== `vista-${nombre}`;
            }
        );
    }

    // Información detallada.

    function mostrar_detalle() {
        const envio = datos_envio();

        if (!envio) return;

        const campos = {
            "detalle-id": envio.envio_id,
            "detalle-pedido": envio.pedido_id,
            "detalle-cliente": envio.cliente,
            "detalle-telefono": envio.telefono,
            "detalle-direccion":
                envio.direccion || envio.direccion_id,
            "detalle-empleado":
                envio.empleado || envio.empleado_id,
            "detalle-costo-envio":
                moneda(envio.costo_envio),
            "detalle-fecha-salida": envio.fecha_salida,
            "detalle-fecha-entrega-real":
                envio.fecha_entrega_real,
            "detalle-notas": envio.notas
        };

        for (const [id, valor] of Object.entries(campos)) {
            obtener(id).textContent = texto(valor);
        }

        obtener("detalle-envio").textContent =
            `Envío #${texto(envio.envio_id, "—")}`;

        for (const id of [
            "detalle-fecha-salida",
            "detalle-fecha-entrega-real"
        ]) {
            const elemento = obtener(id);
            const valor = id === "detalle-fecha-salida"
                ? envio.fecha_salida
                : envio.fecha_entrega_real;

            if (valor) {
                elemento.dateTime = String(valor)
                    .replace(" ", "T");
            } else {
                elemento.removeAttribute("datetime");
            }
        }
    }

    // Opciones de selección para edición.

    function establecer_opcion(id, valor, descripcion) {
        const selector = obtener(id);

        if (!valor) {
            selector.value = "";
            return;
        }

        const existe = Array.from(selector.options).some(
            (opcion) => opcion.value === String(valor)
        );

        if (!existe) {
            const opcion = new Option(
                descripcion || String(valor),
                String(valor)
            );

            opcion.dataset.temporal = "true";
            selector.add(opcion);
        }

        selector.value = String(valor);
    }

    function limpiar_opciones_temporales() {
        document.querySelectorAll(
            "#formulario-envio option[data-temporal]"
        ).forEach((opcion) => opcion.remove());
    }

    // Registro y edición.

    function preparar_formulario(editar = false) {
        const formulario = obtener("formulario-envio");

        formulario.reset();
        limpiar_opciones_temporales();

        obtener("titulo-formulario").textContent =
            editar ? "Editar envío" : "Registrar envío";

        obtener("descripcion-formulario").textContent =
            editar
                ? "Modificar los datos del envío seleccionado."
                : "Registrar una entrega a partir de un pedido existente.";

        obtener("guardar-formulario").textContent =
            editar ? "Guardar cambios" : "Registrar envío";

        obtener("envio-id").value = "";

        if (!editar) return;

        const envio = datos_envio();

        if (!envio) return;

        obtener("envio-id").value = envio.envio_id;

        establecer_opcion(
            "envio-pedido",
            envio.pedido_id,
            `Pedido #${envio.pedido_id}`
        );

        obtener("envio-cliente").value =
            envio.cliente;

        obtener("envio-telefono").value =
            envio.telefono;

        establecer_opcion(
            "envio-direccion",
            envio.direccion_id,
            envio.direccion ||
                `Dirección #${envio.direccion_id}`
        );

        establecer_opcion(
            "envio-repartidor",
            envio.empleado_id,
            envio.empleado ||
                `Empleado #${envio.empleado_id}`
        );

        obtener("envio-costo").value =
            envio.costo_envio;

        obtener("envio-fecha-salida").value =
            fecha_formulario(envio.fecha_salida);

        obtener("envio-fecha-entrega-real").value =
            fecha_formulario(envio.fecha_entrega_real);

        obtener("envio-observaciones").value =
            envio.notas;
    }

    // Indicadores del listado.

    function actualizar_indicadores() {
        const filas = Array.from(
            document.querySelectorAll(
                "#tabla-envios .fila-envio"
            )
        );

        const con_salida = filas.filter(
            (fila) => Boolean(fila.dataset.fechaSalida)
        ).length;

        const con_entrega = filas.filter(
            (fila) =>
                Boolean(fila.dataset.fechaEntregaReal)
        ).length;

        obtener("total-envios").textContent =
            filas.length;

        obtener("total-con-salida").textContent =
            con_salida;

        obtener("total-con-entrega").textContent =
            con_entrega;
    }

    // Búsqueda en el listado.

    function filtrar_envios() {
        const busqueda = obtener("buscar-envio")
            .value
            .trim()
            .toLowerCase();

        const filas = document.querySelectorAll(
            "#tabla-envios .fila-envio"
        );

        let visibles = 0;

        filas.forEach((fila) => {
            const coincide = fila.textContent
                .toLowerCase()
                .includes(busqueda);

            fila.hidden = !coincide;

            if (coincide) {
                visibles++;
            }
        });

        obtener("contador-envios").textContent =
            `${visibles} envíos`;

        obtener("sin-envios").hidden =
            visibles > 0;

        actualizar_indicadores();
    }

    // Preparación del modal de estado.

    function preparar_modal_estado() {
        const modal = obtener("actualizar-estado");
        const envio = datos_envio();

        if (!modal || !envio) return;

        obtener("estado-pedido").textContent =
            texto(envio.pedido_id);

        obtener("estado-cliente").textContent =
            texto(envio.cliente);

        obtener("estado-actual").textContent =
            texto(envio.estado);

        obtener("formulario-estado").reset();

        const mensaje = obtener("mensaje-estado");

        mensaje.textContent = "";
        mensaje.hidden = true;

        modal.showModal();
    }

    // Navegación y botones.

    document.addEventListener("click", (evento) => {
        const boton = evento.target.closest("button");

        if (!boton) return;

        const fila = boton.closest(".fila-envio");

        if (fila) {
            envio_seleccionado = fila;
        }

        if (boton.dataset.cerrarModal) {
            obtener(boton.dataset.cerrarModal)?.close();
            return;
        }

        if (boton.dataset.modal === "actualizar-estado") {
            preparar_modal_estado();
            return;
        }

        const destino = boton.dataset.ir;

        if (destino === "listado") {
            mostrar_vista("listado");
            return;
        }

        if (destino === "registrar") {
            envio_seleccionado = null;
            preparar_formulario(false);
            mostrar_vista("formulario");
            return;
        }

        if (destino === "editar") {
            if (!envio_seleccionado) return;

            preparar_formulario(true);
            mostrar_vista("formulario");
            return;
        }

        if (destino === "detalle") {
            if (!envio_seleccionado) return;

            mostrar_detalle();
            mostrar_vista("detalle");
        }
    });

    // Filtro de búsqueda.

    obtener("buscar-envio").addEventListener(
        "input",
        filtrar_envios
    );

    // Envío del formulario.
    // No se realizan operaciones de escritura todavía.

    obtener("formulario-envio").addEventListener(
        "submit",
        (evento) => {
            evento.preventDefault();

            console.info(
                "El registro y edición de envíos están pendientes de integración con el backend Java."
            );
        }
    );

    // Estado provisional: se conserva el modal original.

    obtener("formulario-estado")?.addEventListener(
        "submit",
        (evento) => {
            evento.preventDefault();

            const mensaje = obtener("mensaje-estado");

            mensaje.textContent =
                "La actualización de estado está pendiente de integración con Java.";

            mensaje.hidden = false;
        }
    );

    // Inicialización.

    actualizar_indicadores();
    filtrar_envios();
    mostrar_vista("listado");
});
