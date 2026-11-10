import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', title: 'Login · Repostería Vanabby', loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage) },
  { path: 'inicio', title: 'Inicio · Repostería Vanabby', loadComponent: () => import('./pages/inicio/inicio.page').then((m) => m.InicioPage) },
  { path: 'productos', title: 'Productos · Repostería Vanabby', loadComponent: () => import('./pages/productos/productos.page').then((m) => m.ProductosPage) },
  { path: 'clientes', title: 'Clientes · Repostería Vanabby', loadComponent: () => import('./pages/clientes/clientes.page').then((m) => m.ClientesPage) },
  { path: 'pedidos', title: 'Pedidos · Repostería Vanabby', loadComponent: () => import('./pages/pedidos/pedidos.page').then((m) => m.PedidosPage) },
  { path: 'envios', title: 'Envios · Repostería Vanabby', loadComponent: () => import('./pages/envios/envios.page').then((m) => m.EnviosPage) },
  { path: 'pagos', title: 'Pagos · Repostería Vanabby', loadComponent: () => import('./pages/pagos/pagos.page').then((m) => m.PagosPage) },
  { path: 'compras', title: 'Compras · Repostería Vanabby', loadComponent: () => import('./pages/compras/compras.page').then((m) => m.ComprasPage) },
  { path: 'almacen', title: 'Almacen · Repostería Vanabby', loadComponent: () => import('./pages/almacen/almacen.page').then((m) => m.AlmacenPage) },
  { path: 'monitoreo', title: 'Monitoreo · Repostería Vanabby', loadComponent: () => import('./pages/monitoreo/monitoreo.page').then((m) => m.MonitoreoPage) },
  { path: '**', redirectTo: 'login' },
];
