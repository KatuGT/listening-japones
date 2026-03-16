import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Guarda para rutas de "invitados" (ej: login)
// Si el usuario YA está logueado, lo redirige al home.
export const guestGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoading()) {
    await authService.checkSession();
  }

  if (authService.currentUser()) {
    // Usuario logueado → no puede ver esta página, mandamos al home
    router.navigate(['/']);
    return false;
  }

  // Sin sesión → puede ver la página de login normalmente
  return true;
};
