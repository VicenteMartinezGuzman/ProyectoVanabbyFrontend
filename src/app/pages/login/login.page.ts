import { Component, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BootstrapCssService } from '../../core/bootstrap-css.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrl: './login.page.css',
  encapsulation: ViewEncapsulation.None,
})
export class LoginPage implements OnDestroy {
  private bs = inject(BootstrapCssService);
  private router = inject(Router);

  constructor() { this.bs.enable(); }
  ngOnDestroy() { this.bs.disable(); }

  /** El original no tenía JS (el form hacía POST); aquí se entra al panel de inicio. */
  entrar(ev: Event) {
    ev.preventDefault();
    this.router.navigateByUrl('/inicio');
  }
}
