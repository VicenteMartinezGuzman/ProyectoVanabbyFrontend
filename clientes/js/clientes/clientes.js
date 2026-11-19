
(() => {
    "use strict";

    const obtener = (id) => document.getElementById(id);

    // Ruta provisional del backend Java.
    const api = {
        clientes: "/api/clientes"
    };

    const archivos_modales = [
        "registrar-cliente.html",
        "editar-cliente.html",
        "eliminar-cliente.html"
    ];

    const clientes_por_pagina = 10;

    let clientes = [];
    let pagina_actual = 1;
    let cliente_seleccionado_id = null;

    // Utilidades.

    function normalizar(valor) {
        return String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function texto(valor, alternativa = "No registrado") {
        return valor === null ||
            valor === undefined ||
            valor === ""
            ? alternativa
            : String(valor);
    }

    function nombre_cliente(cliente) {
        return [
            cliente.nombre,
            cliente.ap_paterno,
            cliente.ap_materno
        ].filter(Boolean).join(" ") || "Sin nombre";
    }

    function direccion_cliente(cliente) {
        if (Array.isArray(cliente.direcciones)) {
            return cliente.direcciones.find(
                (direccion) => Number(direccion.es_principal) === 1
            ) ?? cliente.direcciones[0] ?? null;
        }

        if (
            cliente.direccion &&
            typeof cliente.direccion === "object"
        ) {
            return cliente.direccion;
        }

        return null;
    }

    function descripcion_direccion(direccion) {
        if (!direccion) {
            return "Sin dirección registrada";
        }

        const calle_numero = [
            direccion.calle,
            direccion.numero
        ].filter(Boolean).join(" ");

        const contenido = [
            direccion.alias,
            calle_numero,
            direccion.colonia,
            direccion.ciudad,
            direccion.estado_geo,
            direccion.cp
        ].filter(Boolean).join(", ");

        return contenido || "Sin dirección registrada";
    }

    function cliente_seleccionado() {
        return clientes.find(
            (cliente) =>
                String(cliente.cliente_id) ===
                String(cliente_seleccionado_id)
        );
    }

    function mostrar_mensaje(id, mensaje) {
        const elemento = obtener(id);

        if (!elemento) return;

        elemento.textContent = mensaje;
        elemento.hidden = !mensaje;
    }

    // Comunicación con el backend.

    async function solicitar_api(ruta, opciones = {}) {
        const respuesta = await fetch(ruta, {
            credentials: "same-origin",
            ...opciones
        });

        const tipo = respuesta.headers.get("content-type") ?? "";

        const datos = tipo.includes("application/json")
            ? await respuesta.json()
            : null;

        if (!respuesta.ok) {
            throw new Error(
                datos?.mensaje ??
                `El servidor respondió con el código ${respuesta.status}.`
            );
        }

        return datos;
    }

    // Carga de modales.

    async function cargar_modales() {
        const contenedor = obtener("contenedor-modales");

        for (const archivo of archivos_modales) {
            const ruta = new URL(
                `modales/${archivo}`,
                document.baseURI
            );

            const respuesta = await fetch(ruta);

            if (!respuesta.ok) {
                throw new Error(
                    `No se pudo cargar ${archivo}.`
                );
            }

            const contenido = await respuesta.text();

            const documento = new DOMParser().parseFromString(
                contenido,
                "text/html"
            );

            const modal = documento.querySelector("dialog");

            if (!modal) {
                throw new Error(
                    `El archivo ${archivo} no contiene un modal.`
                );
            }

            contenedor.append(modal);
        }
    }

    // Preparación del registro.

    function preparar_registro() {
        const formulario = obtener(
            "formulario-registrar-cliente"
        );

        formulario.reset();

        mostrar_mensaje(
            "mensaje-registrar-cliente",
            ""
        );
    }

    // Preparación de la edición.

    function preparar_edicion(cliente) {
        const formulario = obtener(
            "formulario-editar-cliente"
        );

        formulario.reset();

        obtener("editar-id").value =
            cliente.cliente_id;

        obtener("editar-identificador").textContent =
            cliente.cliente_id;

        const fecha = obtener("editar-fecha-registro");

        fecha.textContent = texto(
            cliente.creado_en,
            "No registrada"
        );

        fecha.dateTime = cliente.creado_en ?? "";

        // Datos de cliente.

        obtener("editar-nombre").value =
            cliente.nombre ?? "";

        obtener("editar-apellido-paterno").value =
            cliente.ap_paterno ?? "";

        obtener("editar-apellido-materno").value =
            cliente.ap_materno ?? "";

        obtener("editar-telefono").value =
            cliente.telefono ?? "";

        obtener("editar-correo").value =
            cliente.correo ?? "";

        // Dirección asociada.

        const direccion = direccion_cliente(cliente);

        obtener("editar-direccion-id").value =
            direccion?.direccion_id ?? "";

        const campos_direccion = [
            "alias",
            "calle",
            "numero",
            "colonia",
            "ciudad",
            "estado_geo",
            "cp",
            "es_principal"
        ];

        for (const campo of campos_direccion) {
            const identificador = `editar-${campo.replaceAll("_", "-")}`;

            obtener(identificador).value =
                direccion?.[campo] ?? "";
        }

        mostrar_mensaje(
            "mensaje-editar-cliente",
            ""
        );
    }

    // Preparación de la eliminación.

    function preparar_eliminacion(cliente) {
        obtener("eliminar-nombre").textContent =
            nombre_cliente(cliente);

        obtener("eliminar-id").textContent =
            cliente.cliente_id;

        obtener("eliminar-telefono").textContent =
            texto(cliente.telefono);

        obtener("eliminar-correo").textContent =
            texto(cliente.correo);

        mostrar_mensaje(
            "mensaje-eliminar-cliente",
            ""
        );
    }

    // Apertura de modales.

    function abrir_modal(nombre) {
        const modal = obtener(nombre);

        if (!modal) {
            mostrar_mensaje(
                "estado-clientes",
                `No se encontró la ventana ${nombre}.`
            );

            return;
        }

        if (nombre === "registrar-cliente") {
            preparar_registro();
        } else {
            const cliente = cliente_seleccionado();

            if (!cliente) return;

            if (nombre === "editar-cliente") {
                preparar_edicion(cliente);
            }

            if (nombre === "eliminar-cliente") {
                preparar_eliminacion(cliente);
            }
        }

        const abierto = document.querySelector(
            "dialog[open]"
        );

        if (abierto) {
            abierto.close();
        }

        modal.showModal();
    }

    // Indicadores.

    function actualizar_indicadores() {
        const con_telefono = clientes.filter(
            (cliente) => normalizar(cliente.telefono) !== ""
        ).length;

        const con_correo = clientes.filter(
            (cliente) => normalizar(cliente.correo) !== ""
        ).length;

        obtener("total-clientes").textContent =
            clientes.length;

        obtener("total-con-telefono").textContent =
            con_telefono;

        obtener("total-con-correo").textContent =
            con_correo;
    }

    // Búsqueda.

    function filtrar_clientes() {
        const busqueda = normalizar(
            obtener("buscar-cliente").value
        );

        return clientes.filter((cliente) => {
            const direccion = direccion_cliente(cliente);

            const contenido = normalizar([
                nombre_cliente(cliente),
                cliente.telefono,
                cliente.correo,
                descripcion_direccion(direccion)
            ].join(" "));

            return contenido.includes(busqueda);
        });
    }

    // Construcción de filas.

    function crear_fila(cliente) {
        const plantilla = obtener("plantilla-cliente");

        const fragmento = plantilla.content.cloneNode(true);

        const fila = fragmento.querySelector(
            ".fila-cliente"
        );

        const nombre = nombre_cliente(cliente);

        fila.dataset.id = String(cliente.cliente_id);

        fila.querySelector(".celda-id").textContent =
            cliente.cliente_id;

        fila.querySelector(".celda-nombre").textContent =
            nombre;

        fila.querySelector(".celda-telefono").textContent =
            texto(cliente.telefono);

        fila.querySelector(".celda-correo").textContent =
            texto(cliente.correo);

        fila.querySelector(".domicilio-cliente").textContent =
            descripcion_direccion(
                direccion_cliente(cliente)
            );

        fila.querySelector(".boton-editar").setAttribute(
            "aria-label",
            `Editar ${nombre}`
        );

        fila.querySelector(".boton-eliminar").setAttribute(
            "aria-label",
            `Eliminar ${nombre}`
        );

        return fragmento;
    }

    // Renderizado de clientes.

    function renderizar_clientes() {
        actualizar_indicadores();

        const encontrados = filtrar_clientes();

        const total_paginas = Math.max(
            1,
            Math.ceil(
                encontrados.length / clientes_por_pagina
            )
        );

        pagina_actual = Math.min(
            pagina_actual,
            total_paginas
        );

        const inicio =
            (pagina_actual - 1) * clientes_por_pagina;

        const visibles = encontrados.slice(
            inicio,
            inicio + clientes_por_pagina
        );

        const tabla = obtener("tabla-clientes");

        tabla.replaceChildren();

        for (const cliente of visibles) {
            tabla.append(
                crear_fila(cliente)
            );
        }

        obtener("contador-clientes").textContent =
            `Mostrando ${visibles.length} de ${encontrados.length} clientes`;

        const estado = obtener("estado-clientes");

        estado.hidden = encontrados.length > 0;

        estado.textContent = clientes.length === 0
            ? "No hay clientes registrados."
            : "No se encontraron clientes con esa búsqueda.";

        obtener("pagina-actual").textContent =
            pagina_actual;

        obtener("pagina-anterior").disabled =
            pagina_actual <= 1;

        obtener("pagina-siguiente").disabled =
            pagina_actual >= total_paginas;
    }

    // Consulta de clientes.

    async function cargar_clientes() {
        const datos = await solicitar_api(
            api.clientes
        );

        if (!Array.isArray(datos)) {
            throw new Error(
                "El servidor devolvió datos de clientes inválidos."
            );
        }

        clientes = datos;

        renderizar_clientes();
    }

    // Registro y edición.

    async function guardar_cliente(formulario) {
        const es_edicion =
            formulario.id === "formulario-editar-cliente";

        const mensaje_id = es_edicion
            ? "mensaje-editar-cliente"
            : "mensaje-registrar-cliente";

        mostrar_mensaje(mensaje_id, "");

        const boton = formulario.querySelector(
            '[type="submit"]'
        );

        const ruta = es_edicion
            ? `${api.clientes}/${encodeURIComponent(obtener("editar-id").value)}`
            : api.clientes;

        try {
            boton.disabled = true;

            const datos = new FormData(formulario);

            await solicitar_api(ruta, {
                method: es_edicion ? "PUT" : "POST",
                body: datos
            });

            formulario.closest("dialog").close();

            pagina_actual = 1;

            await cargar_clientes();

        } catch (error) {
            mostrar_mensaje(
                mensaje_id,
                error.message
            );
        } finally {
            boton.disabled = false;
        }
    }

    // Eliminación.

    async function eliminar_cliente() {
        const cliente = cliente_seleccionado();

        if (!cliente) return;

        const boton = obtener(
            "confirmar-eliminar-cliente"
        );

        boton.disabled = true;

        try {
            const ruta = `${api.clientes}/${encodeURIComponent(cliente.cliente_id)}`;

            await solicitar_api(ruta, {
                method: "DELETE"
            });

            obtener("eliminar-cliente").close();

            cliente_seleccionado_id = null;

            await cargar_clientes();

        } catch (error) {
            mostrar_mensaje(
                "mensaje-eliminar-cliente",
                error.message
            );
        } finally {
            boton.disabled = false;
        }
    }

    // Eventos de botones.

    document.addEventListener("click", (evento) => {
        const boton = evento.target.closest("button");

        if (!boton) return;

        if (boton.dataset.cerrarModal) {
            obtener(boton.dataset.cerrarModal)?.close();
            return;
        }

        if (boton.dataset.modal) {
            abrir_modal(boton.dataset.modal);
            return;
        }

        const fila = boton.closest(".fila-cliente");

        if (fila && boton.dataset.accion) {
            cliente_seleccionado_id = fila.dataset.id;

            if (boton.dataset.accion === "editar") {
                abrir_modal("editar-cliente");
            }

            if (boton.dataset.accion === "eliminar") {
                abrir_modal("eliminar-cliente");
            }

            return;
        }

        if (boton.id === "confirmar-eliminar-cliente") {
            eliminar_cliente();
        }
    });

    // Envío de formularios.

    document.addEventListener("submit", (evento) => {
        const formularios = [
            "formulario-registrar-cliente",
            "formulario-editar-cliente"
        ];

        if (!formularios.includes(evento.target.id)) {
            return;
        }

        evento.preventDefault();

        guardar_cliente(evento.target);
    });

    // Búsqueda.

    obtener("buscar-cliente").addEventListener(
        "input",
        () => {
            pagina_actual = 1;
            renderizar_clientes();
        }
    );

    // Paginación.

    obtener("pagina-anterior").addEventListener(
        "click",
        () => {
            if (pagina_actual <= 1) return;

            pagina_actual--;

            renderizar_clientes();
        }
    );

    obtener("pagina-siguiente").addEventListener(
        "click",
        () => {
            const total_paginas = Math.ceil(
                filtrar_clientes().length /
                clientes_por_pagina
            );

            if (pagina_actual >= total_paginas) {
                return;
            }

            pagina_actual++;

            renderizar_clientes();
        }
    );

    // Inicialización.

    async function iniciar() {
        try {
            await cargar_modales();
        } catch (error) {
            mostrar_mensaje(
                "estado-clientes",
                error.message
            );

            return;
        }

        try {
            await cargar_clientes();
        } catch (error) {
            mostrar_mensaje(
                "estado-clientes",
                `No se pudo consultar el backend: ${error.message}`
            );
        }
    }

    iniciar();

})();
