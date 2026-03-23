import { inject, Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';

/**
 * Servicio didáctico: "ProfileService"
 * En Angular, usamos servicios para compartir estado entre pantallas.
 * Aquí guardamos la información del perfil (scores, logros, etc) para que,
 * si sales de la pantalla y vuelves, no tengamos que pedírselo a la base de datos de nuevo.
 */
@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private supabase = inject(SupabaseService);

  // El email "dueño" del sitio (fallback de seguridad)
  private readonly ADMIN_EMAIL = '93katu@gmail.com';

  // Cache signals (Estado reactivo compartido)
  highScores = signal<any[]>([]);
  feedbackList = signal<any[]>([]);
  profileData = signal<any>(null);
  
  // Computed property para saber si es admin
  isAdmin = computed(() => {
    const profile = this.profileData();
    if (profile?.is_admin) return true;
    
    // Si no ha cargado el profile pero el email coincide
    return false; // Por ahora mejor esperar al profile o checkear el currentUser
  });

  // Una versión que no dependa solo del profile si queremos rapidez
  isUserAdmin(user: any) {
    return user?.email === this.ADMIN_EMAIL || this.profileData()?.is_admin;
  }

  hasLoaded = signal(false);
  isLoading = signal(false);

  /**
   * Carga los datos solo si no los tenemos ya en memoria (caché).
   * @param force Si es true, ignora la caché y recarga todo (ej: tras una actualización).
   */
  async loadProfileData(force = false) {
    if (this.hasLoaded() && !force) return;

    this.isLoading.set(true);
    try {
      const { data: { user } } = await this.supabase.getUser();
      if (!user) return;

      const [scores, feedback, profile] = await Promise.all([
        this.supabase.getUserHighScores(),
        this.supabase.getUserFeedback(),
        this.supabase.getProfile(user.id)
      ]);

      this.highScores.set(scores || []);
      this.feedbackList.set(feedback || []);
      this.profileData.set(profile);
      this.hasLoaded.set(true);
    } catch (err) {
      console.error('Error loading profile data:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Método para limpiar la caché al cerrar sesión.
   */
  clearCache() {
    this.highScores.set([]);
    this.feedbackList.set([]);
    this.profileData.set(null);
    this.hasLoaded.set(false);
  }
}
