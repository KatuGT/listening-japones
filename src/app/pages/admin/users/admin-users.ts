import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-users.html',
  styleUrls: ['./admin-users.scss'],
})
export class AdminUsers {
  private supabase = inject(SupabaseService);
  profilesList = signal<any[]>([]);

  constructor() {
    this.loadProfiles();
  }

  async loadProfiles() {
    try {
      const profiles = await this.supabase.getAllProfiles();
      this.profilesList.set(profiles);
    } catch (err) {
      console.error('Error loading profiles', err);
    }
  }

  async toggleBlockUser(profile: any) {
    try {
      await this.supabase.updateProfile(profile.id, { is_blocked: !profile.is_blocked });
      this.loadProfiles();
    } catch (err) {
      console.error('Error toggling block', err);
    }
  }

  async updateUserRole(profile: any, newRole: string) {
    if (!confirm(`¿Cambiar el rol de ${profile.email} a ${newRole}?`)) return;
    try {
      await this.supabase.updateProfile(profile.id, {
        role: newRole,
        is_admin: newRole === 'admin' || newRole === 'collaborator',
      });
      this.loadProfiles();
    } catch (err) {
      console.error('Error updating role', err);
    }
  }
}
