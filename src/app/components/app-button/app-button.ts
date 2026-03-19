import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';

export type ButtonVariant = 'primary' | 'success' | 'secondary' | 'danger' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [NgClass, RouterLink],
  templateUrl: './app-button.html',
  styleUrls: ['./app-button.scss'],
})
export class AppButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() block = false;
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() routerLink: string | any[] | null = null;
  @Input() target: '_blank' | '_self' | '_parent' | '_top' | null = null;

  get classes() {
    return {
      'btn': true,
      ['btn-' + this.variant]: true,
      ['btn-' + this.size]: true,
      'btn-block': this.block,
      'btn-disabled': this.disabled,
    };
  }
}
