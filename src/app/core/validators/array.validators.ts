import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Requires a non-empty array (e.g. multi-select fields). */
export function nonEmptyArray(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return Array.isArray(value) && value.length > 0 ? null : { required: true };
}
