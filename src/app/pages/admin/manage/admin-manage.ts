import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-admin-manage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-manage.html',
  styleUrls: ['./admin-manage.scss'],
})
export class AdminManage {
  private supabase = inject(SupabaseService);

  @Output() editVideo = new EventEmitter<any>();

  videoList = signal<any[]>([]);
  statusMessage = signal('');

  constructor() {
    this.loadVideos();
  }

  async loadVideos() {
    try {
      const videos = await this.supabase.getAdminVideos();
      this.videoList.set(videos);
    } catch (err) {
      console.error('Error loading videos', err);
      this.statusMessage.set('Error cargando videos.');
    }
  }

  async approveVideo(id: string) {
    if (!confirm('¿Aprobar este video para su publicación?')) return;
    try {
      await this.supabase.approveVideo(id);
      this.loadVideos();
    } catch (err) {
      console.error('Error approving video', err);
    }
  }

  async deleteVideo(id: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar este video?')) return;
    try {
      await this.supabase.deleteSubtitles(id);
      await this.supabase.deleteVideo(id);
      this.loadVideos();
    } catch (err) {
      console.error('Error deleting video', err);
    }
  }

  onEdit(video: any) {
    this.editVideo.emit(video);
  }
}
