import { Component, EventEmitter, inject, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';
import { ListeningService } from '../../../services/listening.service';

@Component({
  selector: 'app-admin-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-manage.html',
  styleUrls: ['./admin-manage.scss'],
})
export class AdminManage {
  private supabase = inject(SupabaseService);
  private listeningService = inject(ListeningService);

  @Output() editVideo = new EventEmitter<any>();

  videoList = this.listeningService.adminVideos;
  
  // Filtros
  searchQuery = signal('');
  selectedFormat = signal('Todos');
  
  filteredVideos = computed(() => {
    let videos = this.videoList();
    
    // Filtrar por formato
    if (this.selectedFormat() !== 'Todos') {
      videos = videos.filter(v => v.media_format === this.selectedFormat());
    }
    
    // Filtrar por texto
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      videos = videos.filter(v => 
        (v.title && v.title.toLowerCase().includes(q)) || 
        (v.slug && v.slug.toLowerCase().includes(q))
      );
    }
    
    return videos;
  });

  statusMessage = signal('');

  constructor() {
    this.loadVideos();
  }

  async loadVideos() {
    try {
      // Si ya cargamos y no estamos forzando refresh, salimos
      if (this.videoList().length > 0 && this.listeningService.hasLoadedAdmin()) {
        return;
      }

      const videos = await this.supabase.getAdminVideos();
      this.videoList.set(videos);
      this.listeningService.hasLoadedAdmin.set(true);
    } catch (err) {
      console.error('Error loading videos', err);
      this.statusMessage.set('Error cargando videos.');
    }
  }

  async approveVideo(id: string) {
    if (!confirm('¿Aprobar este video para su publicación?')) return;
    try {
      await this.supabase.approveVideo(id);
      // Forzamos recarga invalidando el caché
      this.listeningService.hasLoadedAdmin.set(false);
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
      // Forzamos recarga invalidando el caché
      this.listeningService.hasLoadedAdmin.set(false);
      this.loadVideos();
    } catch (err) {
      console.error('Error deleting video', err);
    }
  }

  onEdit(video: any) {
    this.editVideo.emit(video);
  }
}
