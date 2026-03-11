import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { Video } from '../../models/video.model';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  videos = signal<Video[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  async ngOnInit() {
    await this.loadVideos();
  }

  async loadVideos() {
    try {
      this.isLoading.set(true);
      this.error.set(null);
      const data = await this.supabaseService.getVideos(true); // Solo activos para el público
      this.videos.set(data as Video[]);
    } catch (err: any) {
      this.error.set(err.message || 'Error cargando videos');
      console.error('Error loading videos', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  goToVideo(id: string) {
    this.router.navigate(['/play', id]);
  }

  playPreview(event: MouseEvent) {
    const video = event.currentTarget as HTMLVideoElement;
    video.play().catch(() => {}); // Ignorar errores de autoplay bloqueado
  }

  stopPreview(event: MouseEvent) {
    const video = event.currentTarget as HTMLVideoElement;
    video.pause();
    video.currentTime = 0;
  }
}
