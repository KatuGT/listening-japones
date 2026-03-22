import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [DatePipe, UpperCasePipe, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class ProfileComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private seoService = inject(SeoService);
  auth = inject(AuthService);
  profileService = inject(ProfileService);

  // Nickname logic local
  nickname = signal('');
  nicknameStatus = signal<'checking' | 'available' | 'taken' | 'invalid' | 'none'>('none');
  isSaving = signal(false);
  saveMessage = signal('');

  constructor() {
    // Sincronizar el nickname local cuando el perfil se cargue/cambie
    effect(() => {
      const p = this.profileService.profileData();
      if (p?.nickname) {
        this.nickname.set(p.nickname);
      }
    });
  }

  async ngOnInit() {
    await this.profileService.loadProfileData();
  }

  async onNicknameChange(val: string) {
    this.nickname.set(val);
    this.saveMessage.set('');
    
    if (!val || val.length < 3) {
      this.nicknameStatus.set('invalid');
      return;
    }

    if (val === this.profileService.profileData()?.nickname) {
      this.nicknameStatus.set('none');
      return;
    }

    this.nicknameStatus.set('checking');
    try {
      const available = await this.supabase.checkNicknameAvailability(val);
      this.nicknameStatus.set(available ? 'available' : 'taken');
    } catch (err) {
      this.nicknameStatus.set('none');
    }
  }

  async saveNickname() {
    if (this.nicknameStatus() !== 'available' && this.nicknameStatus() !== 'none') return;
    const currentProfile = this.profileService.profileData();
    if (this.nickname() === currentProfile?.nickname) return;

    this.isSaving.set(true);
    this.saveMessage.set('');
    
    try {
      await this.supabase.updateProfile(currentProfile.id, {
        nickname: this.nickname()
      });
      this.saveMessage.set('✅ ¡Nickname actualizado!');
      this.nicknameStatus.set('none');
      // Recargar perfil local (esto actualizará la caché del servicio)
      await this.profileService.loadProfileData(true);
    } catch (err: any) {
      console.error('Error saving nickname', err);
      this.saveMessage.set('❌ Error al guardar. Intenta con otro.');
    } finally {
      this.isSaving.set(false);
    }
  }

  getBadgeCount() {
    return this.profileService.highScores().filter((s: any) => s.score === 100).length;
  }
}
