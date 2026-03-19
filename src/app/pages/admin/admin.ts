import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { AdminUpload } from './upload/admin-upload';
import { AdminManage } from './manage/admin-manage';
import { AdminFeedback } from './feedback/admin-feedback';
import { AdminUsers } from './users/admin-users';
import { AdminRequests } from './requests/admin-requests';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    AdminUpload,
    AdminManage,
    AdminFeedback,
    AdminUsers,
    AdminRequests,
  ],
  templateUrl: './admin.html',
  styleUrls: ['./admin.scss'],
})
export class Admin {
  private auth = inject(AuthService);

  activeTab = signal<'upload' | 'manage' | 'feedback' | 'users' | 'requests'>('upload');
  editingVideo = signal<any | null>(null);

  setTab(tab: 'upload' | 'manage' | 'feedback' | 'users' | 'requests') {
    this.activeTab.set(tab);
  }

  setEditingVideo(video: any | null) {
    this.editingVideo.set(video);
    if (video) this.setTab('upload');
  }

  async logout() {
    await this.auth.logout();
  }
}
