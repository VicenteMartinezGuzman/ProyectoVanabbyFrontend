import { Pipe, PipeTransform, inject } from '@angular/core';
import { VanabbyService } from './vanabby.service';

@Pipe({ name: 'fechaCorta' })
export class FechaCortaPipe implements PipeTransform {
  private v = inject(VanabbyService);
  transform(d: Date | string | number | null | undefined = new Date()): string {
    return this.v.fechaCorta(d ? new Date(d) : new Date());
  }
}

@Pipe({ name: 'moneda' })
export class MonedaPipe implements PipeTransform {
  private v = inject(VanabbyService);
  transform(n: number | string | null | undefined): string { return this.v.moneda(n ?? 0); }
}
