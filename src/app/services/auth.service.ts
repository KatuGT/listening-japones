import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Router } from '@angular/router';
import { ProfileService } from './profile.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private profileService = inject(ProfileService);

  currentUser = signal<any>(null);
  isLoading = signal(true);

  constructor() {
    this.checkSession();
    
    // Escuchar cambios en la sesión (login/logout)
    this.supabase.onAuthStateChange((event, session) => {
      this.currentUser.set(session?.user ?? null);
      this.isLoading.set(false);
      
      if (event === 'SIGNED_IN') {
        // Quitamos la redirección automática a Home para que respete la URL actual al recargar
      }
      if (event === 'SIGNED_OUT') {
        this.profileService.clearCache();
        this.router.navigate(['/login']);
      }
    });
  }

  async checkSession() {
    try {
      const { data: { user } } = await this.supabase.getUser();
      this.currentUser.set(user);
    } catch (err) {
      this.currentUser.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loginWithGoogle() {
    await this.supabase.signInWithGoogle();
  }

  async logout() {
    await this.supabase.signOut();
  }
}
