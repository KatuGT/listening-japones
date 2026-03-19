import { Component, forwardRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './text-input.html',
  styleUrls: ['./text-input.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TextInputComponent),
    multi: true
  }]
})
export class TextInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type = 'text';
  @Input() required = false;
  @Input() disabled = false;
  @Input() name = '';
  @Input() maxLength: number | null = null;

  value = '';
  onChange = (value: any) => {};
  onTouched = () => {};

  writeValue(value: any): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  _onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    let nextValue = target.value;

    if (this.maxLength != null && nextValue.length > this.maxLength) {
      nextValue = nextValue.slice(0, this.maxLength);
    }

    this.value = nextValue;
    this.onChange(this.value);
  }

  _onBlur() {
    this.onTouched();
  }
}
