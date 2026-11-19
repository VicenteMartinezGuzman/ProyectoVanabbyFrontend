
(() => {
    "use strict";

    // Rutas provisionales del backend Java.
    const api = {
        productos: "/api/productos",
        categorias: "/api/categorias"
    };

    const archivos_modales = [
        "registrar-producto.html",
        "detalle-producto.html",
        "editar-producto.html",
        "eliminar-producto.html"
    ];

    const productos_por_pagina = 9;

    const formato_moneda = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN"
    });

    const obtener = (id) => document.getElementById(id);

    let productos = [];
    let categorias = [];
    let pagina_actual = 1;
    let producto_seleccionado_id = null;
    let url_vista_previa = null;

    // Utilidades.

    function normalizar(valor) {
        return String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function mostrar_texto(valor) {
        return valor === null ||
            valor === undefined ||
            valor === ""
            ? "No especificado"
            : String(valor);
    }

    function mostrar_moneda(valor) {
        if (
            valor === null ||
            valor === undefined ||
            valor === "" ||
            !Number.isFinite(Number(valor))
        ) {
            return "Sin precio";
        }

        return formato_moneda.format(Number(valor));
    }

    function informar_catalogo(mensaje) {
        const aviso = obtener("estado-productos");

        aviso.textContent = mensaje;
        aviso.hidden = false;
    }

    function mostrar_error_formulario(formulario, mensaje) {
        let aviso = formulario.querySelector(
            ".mensaje-operacion"
        );

        if (!aviso) {
            aviso = document.createElement("p");
            aviso.className = "mensaje-operacion";
            aviso.setAttribute("role", "alert");

            formulario.querySelector(
                ".contenido-modal"
            ).append(aviso);
        }

        aviso.textContent = mensaje;
        aviso.hidden = false;
    }

    function limpiar_error_formulario(formulario) {
        const aviso = formulario.querySelector(
            ".mensaje-operacion"
        );

        if (aviso) {
            aviso.textContent = "";
            aviso.hidden = true;
        }
    }

    // Relaciones con inventario_producto.

    function inventario_producto(producto) {
        return producto.inventario_producto ??
            producto.inventario ??
            null;
    }

    function dato_inventario(producto, atributo) {
        return producto[atributo] ??
            inventario_producto(producto)?.[atributo] ??
            null;
    }

    // Relaciones con categoria.

    function obtener_categoria_id(producto) {
        return String(
            producto.categoria_id ??
            producto.categoria?.categoria_id ??
            ""
        );
    }

    function obtener_categoria_nombre(producto) {
        if (producto.nombre_categoria) {
            return producto.nombre_categoria;
        }

        if (producto.categoria?.nombre_categoria) {
            return producto.categoria.nombre_categoria;
        }

        const identificador = obtener_categoria_id(producto);

        const categoria = categorias.find(
            (elemento) =>
                String(elemento.categoria_id) === identificador
        );

        return categoria?.nombre_categoria ?? "Sin categoría";
    }

    function buscar_producto_seleccionado() {
        return productos.find(
            (producto) =>
                String(producto.producto_id) ===
                String(producto_seleccionado_id)
        );
    }

    // Comunicación con el backend.

    async function solicitar_api(ruta, opciones = {}) {
        const respuesta = await fetch(ruta, {
            credentials: "same-origin",
            ...opciones
        });

        const tipo = respuesta.headers.get(
            "content-type"
        ) ?? "";

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

    // Carga de los archivos HTML de los modales.

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
                    `No se encontró el modal en ${archivo}.`
                );
            }

            contenedor.append(modal);
        }
    }

    // Categorías.

    function agregar_opciones(
        select,
        elementos,
        texto_inicial
    ) {
        select.replaceChildren(
            new Option(texto_inicial, "")
        );

        for (const categoria of elementos) {
            select.add(
                new Option(
                    categoria.nombre_categoria,
                    String(categoria.categoria_id)
                )
            );
        }
    }

    async function cargar_categorias() {
        const datos = await solicitar_api(
            api.categorias
        );

        if (!Array.isArray(datos)) {
            throw new Error(
                "El servidor devolvió categorías inválidas."
            );
        }

        categorias = datos;

        agregar_opciones(
            obtener("filtro-categoria"),
            categorias,
            "Todas las categorías"
        );

        agregar_opciones(
            obtener("registrar-categoria"),
            categorias,
            "Sin categoría"
        );

        agregar_opciones(
            obtener("editar-categoria"),
            categorias,
            "Sin categoría"
        );
    }

    // Imágenes.

    function mostrar_imagen(elemento, producto) {
        if (producto.imagen) {
            elemento.src = producto.imagen;
            elemento.alt = producto.nombre ?? "Producto";
            elemento.style.removeProperty("display");
        } else {
            elemento.removeAttribute("src");
            elemento.style.display = "none";
        }
    }

    function liberar_vista_previa() {
        if (url_vista_previa) {
            URL.revokeObjectURL(url_vista_previa);
            url_vista_previa = null;
        }
    }

    // Tarjetas del catálogo.

    function crear_tarjeta(producto) {
        const plantilla = obtener("plantilla-producto");

        const fragmento = plantilla.content.cloneNode(true);

        const tarjeta = fragmento.querySelector(".producto");

        tarjeta.dataset.id = String(
            producto.producto_id
        );

        tarjeta.querySelector(
            ".categoria-producto"
        ).textContent = obtener_categoria_nombre(producto);

        tarjeta.querySelector(
            ".sku-producto"
        ).textContent = `SKU: ${mostrar_texto(producto.sku)}`;

        tarjeta.querySelector(
            ".nombre-producto"
        ).textContent = mostrar_texto(producto.nombre);

        tarjeta.querySelector(
            ".descripcion-producto"
        ).textContent = producto.descripcion ?? "";

        tarjeta.querySelector(
            ".precio-producto"
        ).textContent = mostrar_moneda(producto.precio);

        const stock = dato_inventario(
            producto,
            "stock_disponible"
        );

        const stock_minimo = dato_inventario(
            producto,
            "stock_minimo"
        );

        tarjeta.querySelector(
            ".stock-producto"
        ).textContent = stock === null
            ? "Sin registrar"
            : `${stock} u.`;

        tarjeta.querySelector(
            ".stock-minimo-producto"
        ).textContent = stock_minimo === null
            ? "Sin registrar"
            : `${stock_minimo} u.`;

        mostrar_imagen(
            tarjeta.querySelector(".foto-producto"),
            producto
        );

        return fragmento;
    }

    // Búsqueda y filtros.

    function filtrar_productos() {
        const busqueda = normalizar(
            obtener("buscar-producto").value
        );

        const categoria = obtener(
            "filtro-categoria"
        ).value;

        return productos.filter((producto) => {
            const contenido = normalizar([
                producto.sku,
                producto.nombre,
                producto.descripcion
            ].join(" "));

            const coincide_busqueda =
                contenido.includes(busqueda);

            const coincide_categoria =
                !categoria ||
                obtener_categoria_id(producto) === categoria;

            return coincide_busqueda && coincide_categoria;
        });
    }

    // Renderizado del catálogo.

    function renderizar_productos() {
        const encontrados = filtrar_productos();

        const total_paginas = Math.max(
            1,
            Math.ceil(
                encontrados.length / productos_por_pagina
            )
        );

        pagina_actual = Math.min(
            pagina_actual,
            total_paginas
        );

        const inicio =
            (pagina_actual - 1) * productos_por_pagina;

        const visibles = encontrados.slice(
            inicio,
            inicio + productos_por_pagina
        );

        const lista = obtener("lista-productos");

        lista.replaceChildren();

        for (const producto of visibles) {
            lista.append(
                crear_tarjeta(producto)
            );
        }

        const aviso = obtener("estado-productos");

        aviso.hidden = encontrados.length > 0;

        aviso.textContent = productos.length === 0
            ? "No hay productos registrados."
            : "No se encontraron productos con esos filtros.";

        obtener("contador-productos").textContent =
            `Mostrando ${visibles.length} de ${encontrados.length} productos`;

        obtener("pagina-actual").textContent =
            String(pagina_actual);

        obtener("pagina-anterior").disabled =
            pagina_actual <= 1;

        obtener("pagina-siguiente").disabled =
            pagina_actual >= total_paginas;
    }

    // Consulta de productos.

    async function cargar_productos() {
        const datos = await solicitar_api(
            api.productos
        );

        if (!Array.isArray(datos)) {
            throw new Error(
                "El servidor devolvió un catálogo inválido."
            );
        }

        productos = datos;

        renderizar_productos();
    }

    // Información del producto seleccionado.

    function asignar_texto(id, valor) {
        obtener(id).textContent = mostrar_texto(valor);
    }

    function asignar_fecha(id, valor) {
        const elemento = obtener(id);

        elemento.textContent = mostrar_texto(valor);

        if (valor) {
            elemento.dateTime = String(valor);
        } else {
            elemento.removeAttribute("datetime");
        }
    }

    function preparar_detalle(producto) {
        asignar_texto(
            "detalle-nombre",
            producto.nombre
        );

        asignar_texto(
            "detalle-categoria",
            obtener_categoria_nombre(producto)
        );

        asignar_texto(
            "detalle-id",
            producto.producto_id
        );

        asignar_texto(
            "detalle-sku",
            producto.sku
        );

        asignar_texto(
            "detalle-descripcion",
            producto.descripcion
        );

        const preparacion = producto.tiempo_preparacion_min;

        asignar_texto(
            "detalle-preparacion",
            preparacion === null ||
            preparacion === undefined
                ? null
                : `${preparacion} minutos`
        );

        asignar_fecha(
            "detalle-creado-en",
            producto.creado_en
        );

        asignar_texto(
            "detalle-precio",
            mostrar_moneda(producto.precio)
        );

        asignar_texto(
            "detalle-stock",
            dato_inventario(
                producto,
                "stock_disponible"
            )
        );

        asignar_texto(
            "detalle-stock-minimo",
            dato_inventario(
                producto,
                "stock_minimo"
            )
        );

        asignar_fecha(
            "detalle-actualizado-en",
            dato_inventario(
                producto,
                "actualizado_en"
            )
        );

        mostrar_imagen(
            obtener("detalle-imagen"),
            producto
        );
    }

    // Preparación del formulario de registro.

    function preparar_registro() {
        const formulario = obtener(
            "formulario-registrar-producto"
        );

        formulario.reset();

        limpiar_error_formulario(formulario);
    }

    // Preparación del formulario de edición.

    function preparar_edicion(producto) {
        const formulario = obtener(
            "formulario-editar-producto"
        );

        formulario.reset();

        limpiar_error_formulario(formulario);

        liberar_vista_previa();

        obtener("editar-id").value =
            producto.producto_id;

        obtener("editar-inventario-id").value =
            dato_inventario(
                producto,
                "inv_producto_id"
            ) ?? "";

        obtener("editar-sku").value =
            producto.sku ?? "";

        obtener("editar-nombre").value =
            producto.nombre ?? "";

        obtener("editar-descripcion").value =
            producto.descripcion ?? "";

        obtener("editar-categoria").value =
            obtener_categoria_id(producto);

        obtener("editar-precio").value =
            producto.precio ?? "";

        obtener("editar-tiempo-preparacion").value =
            producto.tiempo_preparacion_min ?? "";

        obtener("editar-cantidad").value =
            dato_inventario(
                producto,
                "stock_disponible"
            ) ?? 0;

        obtener("editar-stock-minimo").value =
            dato_inventario(
                producto,
                "stock_minimo"
            ) ?? 0;

        mostrar_imagen(
            obtener("editar-imagen"),
            producto
        );
    }

    // Preparación del modal de eliminación.

    function preparar_eliminacion(producto) {
        asignar_texto(
            "eliminar-nombre",
            producto.nombre
        );

        const mensaje = obtener("mensaje-eliminacion");

        mensaje.hidden = true;
        mensaje.textContent = "";
    }

    // Apertura de ventanas.

    function abrir_modal(nombre) {
        const modal = obtener(nombre);

        if (!modal) {
            informar_catalogo(
                `No se encontró la ventana ${nombre}.`
            );

            return;
        }

        const producto = buscar_producto_seleccionado();

        if (nombre !== "registrar-producto" && !producto) {
            informar_catalogo(
                "Selecciona un producto válido."
            );

            return;
        }

        if (nombre === "registrar-producto") {
            preparar_registro();
        }

        if (nombre === "detalle-producto") {
            preparar_detalle(producto);
        }

        if (nombre === "editar-producto") {
            preparar_edicion(producto);
        }

        if (nombre === "eliminar-producto") {
            preparar_eliminacion(producto);
        }

        const modal_abierto = document.querySelector(
            "dialog[open]"
        );

        if (modal_abierto) {
            modal_abierto.close();
        }

        modal.showModal();
    }

    // Validación de imágenes.

    function validar_imagen(entrada) {
        const archivo = entrada.files[0];

        if (!archivo) return;

        const tipos_permitidos = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!tipos_permitidos.includes(archivo.type)) {
            throw new Error(
                "Selecciona una imagen JPG, PNG o WebP."
            );
        }

        if (archivo.size > 5 * 1024 * 1024) {
            throw new Error(
                "La imagen no debe superar los 5 MB."
            );
        }
    }

    // Registro y actualización.

    async function guardar_producto(formulario) {
        const es_edicion =
            formulario.id === "formulario-editar-producto";

        const identificador = es_edicion
            ? obtener("editar-id").value
            : null;

        const ruta = es_edicion
            ? `${api.productos}/${encodeURIComponent(identificador)}`
            : api.productos;

        const boton = formulario.querySelector(
            '[type="submit"]'
        );

        limpiar_error_formulario(formulario);

        try {
            const imagen = formulario.querySelector(
                'input[type="file"]'
            );

            if (imagen) {
                validar_imagen(imagen);
            }

            boton.disabled = true;

            await solicitar_api(ruta, {
                method: es_edicion ? "PUT" : "POST",
                body: new FormData(formulario)
            });

            formulario.closest("dialog").close();

            pagina_actual = 1;

            await cargar_productos();

        } catch (error) {
            mostrar_error_formulario(
                formulario,
                error.message
            );
        } finally {
            boton.disabled = false;
        }
    }

    // Eliminación.

    async function eliminar_producto() {
        const producto = buscar_producto_seleccionado();

        if (!producto) return;

        const boton = obtener(
            "confirmar-eliminar-producto"
        );

        const mensaje = obtener(
            "mensaje-eliminacion"
        );

        boton.disabled = true;

        try {
            const ruta = `${api.productos}/${encodeURIComponent(producto.producto_id)}`;

            await solicitar_api(ruta, {
                method: "DELETE"
            });

            obtener("eliminar-producto").close();

            producto_seleccionado_id = null;

            await cargar_productos();

        } catch (error) {
            mensaje.textContent = error.message;
            mensaje.hidden = false;
        } finally {
            boton.disabled = false;
        }
    }

    // Eventos de los botones.

    document.addEventListener("click", (evento) => {
        const cerrar = evento.target.closest(
            "[data-cerrar-modal]"
        );

        if (cerrar) {
            obtener(cerrar.dataset.cerrarModal)?.close();
            return;
        }

        const boton = evento.target.closest("button");

        if (!boton) return;

        const tarjeta = boton.closest(".producto");

        if (tarjeta) {
            producto_seleccionado_id = tarjeta.dataset.id;
        }

        if (boton.dataset.modal) {
            abrir_modal(boton.dataset.modal);
            return;
        }

        if (boton.dataset.accion === "detalle") {
            abrir_modal("detalle-producto");
            return;
        }

        if (boton.dataset.accion === "eliminar") {
            abrir_modal("eliminar-producto");
            return;
        }

        if (boton.id === "confirmar-eliminar-producto") {
            eliminar_producto();
        }
    });

    // Eventos de los formularios.

    document.addEventListener("submit", (evento) => {
        const formulario = evento.target;

        const formularios = [
            "formulario-registrar-producto",
            "formulario-editar-producto"
        ];

        if (!formularios.includes(formulario.id)) {
            return;
        }

        evento.preventDefault();

        guardar_producto(formulario);
    });

    // Vista previa de la imagen.

    document.addEventListener("change", (evento) => {
        const entrada = evento.target;

        if (
            entrada.id !== "editar-foto" &&
            entrada.id !== "registrar-imagen"
        ) {
            return;
        }

        const formulario = entrada.closest("form");

        try {
            validar_imagen(entrada);
        } catch (error) {
            mostrar_error_formulario(
                formulario,
                error.message
            );

            entrada.value = "";
            return;
        }

        limpiar_error_formulario(formulario);

        if (entrada.id !== "editar-foto") {
            return;
        }

        const archivo = entrada.files[0];

        if (!archivo) return;

        liberar_vista_previa();

        url_vista_previa = URL.createObjectURL(
            archivo
        );

        const imagen = obtener("editar-imagen");

        imagen.src = url_vista_previa;
        imagen.style.removeProperty("display");
    });

    document.addEventListener("close", (evento) => {
        if (evento.target.id === "editar-producto") {
            liberar_vista_previa();
        }
    }, true);

    // Búsqueda.

    obtener("buscar-producto").addEventListener(
        "input",
        () => {
            pagina_actual = 1;
            renderizar_productos();
        }
    );

    // Filtro por categoría.

    obtener("filtro-categoria").addEventListener(
        "change",
        () => {
            pagina_actual = 1;
            renderizar_productos();
        }
    );

    // Limpiar filtros.

    obtener("formulario-filtros").addEventListener(
        "reset",
        () => {
            queueMicrotask(() => {
                pagina_actual = 1;
                renderizar_productos();
            });
        }
    );

    // Paginación.

    obtener("pagina-anterior").addEventListener(
        "click",
        () => {
            if (pagina_actual <= 1) return;

            pagina_actual--;

            renderizar_productos();
        }
    );

    obtener("pagina-siguiente").addEventListener(
        "click",
        () => {
            const total_paginas = Math.ceil(
                filtrar_productos().length /
                productos_por_pagina
            );

            if (pagina_actual >= total_paginas) {
                return;
            }

            pagina_actual++;

            renderizar_productos();
        }
    );

    // Inicialización.

    async function iniciar() {
        try {
            await cargar_modales();
        } catch (error) {
            informar_catalogo(error.message);
            return;
        }

        try {
            await cargar_categorias();
            await cargar_productos();
        } catch (error) {
            informar_catalogo(
                `No se pudo consultar el backend: ${error.message}`
            );
        }
    }

    iniciar();

})();
