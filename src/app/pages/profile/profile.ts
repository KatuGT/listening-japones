import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class ProfileComponent implements OnInit {
  private supabase = inject(SupabaseService);
  auth = inject(AuthService);

  highScores = signal<any[]>([]);
  feedbackList = signal<any[]>([]);
  isLoading = signal(true);
  
  // Nickname logic
  profile = signal<any>(null);
  nickname = signal('');
  nicknameStatus = signal<'checking' | 'available' | 'taken' | 'invalid' | 'none'>('none');
  isSaving = signal(false);
  saveMessage = signal('');

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const { data: { user } } = await this.supabase.getUser();
      if (!user) return;

      const [scores, feedback, profileData] = await Promise.all([
        this.supabase.getUserHighScores(),
        this.supabase.getUserFeedback(),
        this.supabase.getProfile(user.id)
      ]);
      
      this.highScores.set(scores);
      this.feedbackList.set(feedback);
      this.profile.set(profileData);
      
      if (profileData?.nickname) {
        this.nickname.set(profileData.nickname);
      }
    } catch (err) {
      console.error('Error loading profile data:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onNicknameChange(val: string) {
    this.nickname.set(val);
    this.saveMessage.set('');
    
    if (!val || val.length < 3) {
      this.nicknameStatus.set('invalid');
      return;
    }

    if (val === this.profile()?.nickname) {
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
    if (this.nickname() === this.profile()?.nickname) return;

    this.isSaving.set(true);
    this.saveMessage.set('');
    
    try {
      await this.supabase.updateProfile(this.profile().id, {
        nickname: this.nickname()
      });
      this.saveMessage.set('✅ ¡Nickname actualizado!');
      this.nicknameStatus.set('none');
      // Recargar perfil local
      const updatedProfile = await this.supabase.getProfile(this.profile().id);
      this.profile.set(updatedProfile);
    } catch (err: any) {
      console.error('Error saving nickname', err);
      this.saveMessage.set('❌ Error al guardar. Intenta con otro.');
    } finally {
      this.isSaving.set(false);
    }
  }

  getBadgeCount() {
    return this.highScores().filter(s => s.score === 100).length;
  }
}
