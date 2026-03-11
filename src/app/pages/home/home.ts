import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { Video } from '../../models/video.model';
import { VideoCardSkeletonComponent } from '../../components/skeletons/video-card-skeleton/video-card-skeleton';

@Component({
  selector: 'app-home',
  imports: [CommonModule, VideoCardSkeletonComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  videos = signal<Video[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Filtros y Paginación
  searchQuery = signal<string>('');
  selectedFormat = signal<string>('Todos');
  selectedDifficulty = signal<number>(0); // 0 = Todos
  
  private readonly PAGE_SIZE = 12;
  private currentPage = 0;
  hasMore = signal(false);

  async ngOnInit() {
    await this.loadVideos(true);
  }

  async loadVideos(reset: boolean = false) {
    try {
      if (reset) {
        this.currentPage = 0;
        this.isLoading.set(true);
      }
      this.error.set(null);

      const offset = this.currentPage * this.PAGE_SIZE;

      const { data, count } = await this.supabaseService.getVideos({
        onlyActive: true,
        searchQuery: this.searchQuery(),
        mediaFormat: this.selectedFormat(),
        difficulty: this.selectedDifficulty(),
        limit: this.PAGE_SIZE,
        offset: offset
      });

      const items = data as Video[];

      if (reset) {
        this.videos.set(items);
      } else {
        this.videos.update(curr => [...curr, ...items]);
      }

      this.hasMore.set(count !== null && this.videos().length < count);
    } catch (err: any) {
      this.error.set(err.message || 'Error cargando videos');
      console.error('Error loading videos', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    // Agregamos un pequeño debounce manual básico (podría mejorarse con RxJS si fuera necesario)
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.loadVideos(true);
    }, 400);
  }
  private searchTimeout: any;

  setFormatFilter(format: string) {
    this.selectedFormat.set(format);
    this.loadVideos(true);
  }

  setDifficultyFilter(diff: number) {
    this.selectedDifficulty.set(diff);
    this.loadVideos(true);
  }

  loadMore() {
    if (!this.hasMore() || this.isLoading()) return;
    this.currentPage++;
    this.loadVideos(false);
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
