# Repostería Vanabby · Frontend Angular

Migración de las interfaces HTML/CSS/JS (10 pantallas) a Angular 22 (standalone components, signals, lazy routes).

```
npm install
npm start          # http://localhost:4200
npm run build
```

Rutas: /login, /inicio, /productos, /clientes, /pedidos, /envios, /pagos, /compras, /almacen, /monitoreo.

- `src/app/core/`: `VanabbyService` (localStorage, moneda, toast, QR), pipes y `BootstrapCssService`
  (activa Bootstrap solo en las pantallas que lo usan; pedidos, compras y monitoreo usan `shared/base.css`).
- `src/app/pages/<x>/`: un componente por pantalla, con sus estilos originales.
- Imágenes: copiar a `public/img/` (ver LEEME.txt).
- Los datos siguen siendo de ejemplo/localStorage; para conectar la API reemplazar las lecturas de `VanabbyService` por `HttpClient`.
