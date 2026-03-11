import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Esperar a que termine de cargar la sesión inicial
  if (authService.isLoading()) {
    // Podríamos retornar un Observable que espere, pero para simplicidad
    // asumimos que el primer chequeo es rápido o manejamos el estado
    await authService.checkSession();
  }

  if (authService.currentUser()) {
    return true;
  }

  // Redirigir al login si no hay usuario
  router.navigate(['/login']);
  return false;
};
