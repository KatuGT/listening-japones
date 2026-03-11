import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  currentUser = signal<any>(null);
  isLoading = signal(true);

  constructor() {
    this.checkSession();
    
    // Escuchar cambios en la sesión (login/logout)
    this.supabase.onAuthStateChange((event, session) => {
      this.currentUser.set(session?.user ?? null);
      this.isLoading.set(false);
      
      if (event === 'SIGNED_IN') {
        this.router.navigate(['/admin']);
      }
      if (event === 'SIGNED_OUT') {
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
