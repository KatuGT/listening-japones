import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { toHiragana } from 'wanakana';

@Directive({
  selector: '[appRomajiToHiragana]',
  standalone: true
})
export class RomajiToHiraganaDirective {
  private el = inject(ElementRef);

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const input = this.el.nativeElement as HTMLInputElement;
    const originalValue = input.value;

    // Convertimos a Hiragana en tiempo real
    const converted = toHiragana(originalValue, { IMEMode: true });

    if (originalValue !== converted) {
      // Guardamos la posición del cursor para que no salte al final
      const start = input.selectionStart;
      const end = input.selectionEnd;

      input.value = converted;

      // Restauramos la posición del cursor
      input.setSelectionRange(start, end);

      // Forzamos a Angular a enterarse del cambio de valor
      input.dispatchEvent(new Event('input'));
    }
  }
}
