import { Component, inject, OnInit, signal, afterNextRender } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { KanjiParserService } from '../../services/kanji-parser';
import { Video } from '../../models/video.model';

import { gsap } from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  public kanjiParser = inject(KanjiParserService);

  latestVideos = signal<Video[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Filtros y Búsqueda
  searchQuery = signal('');
  selectedFormat = signal('');
  formats = ['Todos', 'Anime', 'J-Drama', 'Noticias', 'Vlog', 'Música'];

  constructor() {
    afterNextRender(() => {
      gsap.registerPlugin(MorphSVGPlugin);

      // Animación de bienvenida (on load)
      // Damos un pequeño respiro para que todo cargue bien
      setTimeout(() => {
        this.animateLogo(true);
        // Volvemos a romaji tras un momento para que el usuario aprecie el efecto
        setTimeout(() => this.animateLogo(false), 1500);
      }, 800);
    });
  }

  async ngOnInit() {
    await this.loadLatestVideos();
  }

  async loadLatestVideos() {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const { data } = await this.supabaseService.getVideos({
        onlyActive: true,
        limit: 3
      });

      this.latestVideos.set(data as Video[]);
    } catch (err: any) {
      this.error.set(err.message || 'Error cargando videos');
      console.error('Error loading videos', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  goToVideo(slug: string) {
    this.router.navigate(['/play', slug]);
  }

  playPreview(event: MouseEvent) {
    const video = event.currentTarget as HTMLVideoElement;
    video.play().catch(() => { });
  }

  stopPreview(event: MouseEvent) {
    const video = event.currentTarget as HTMLVideoElement;
    video.pause();
    video.currentTime = 0;
  }

  /**
   * Centraliza la animación de morphing del logo.
   * @param toJapanese Si es true, transforma a Hiragana. Si es false, vuelve a Romaji.
   * @param delayFactor El tiempo de retraso entre cada letra para el efecto stagger.
   */
  private animateLogo(toJapanese: boolean, delayFactor: number = 0.08) {
    const paths = [
      { id: '#wa', target: '#wa-target' },
      { id: '#ka', target: '#ka-target' },
      { id: '#ri', target: '#ri-target' },
      { id: '#ma', target: '#ma-target' },
      { id: '#su', target: '#su-target' },
      { id: '#ka2', target: '#ka2-target' },
      { id: '#auriculares', target: '#auriculares-target' }
    ];

    paths.forEach((path, index) => {
      gsap.to(path.id, {
        morphSVG: toJapanese ? path.target : path.id,
        duration: 0.8,
        ease: "power2.inOut",
        delay: index * delayFactor
      });
    });
  }

  onLogoHover() {
    this.animateLogo(true);
  }

  onLogoLeave() {
    this.animateLogo(false);
  }

  goToCatalog() {
    this.router.navigate(['/catalogo']);
  }

  setFormat(format: string) {
    this.selectedFormat.set(format);
    this.router.navigate(['/catalogo'], { 
      queryParams: { format: format === 'Todos' ? null : format } 
    });
  }

  onSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
  }

  triggerSearch() {
    const query = this.searchQuery();
    if (query && query.trim().length >= 2) {
      this.router.navigate(['/catalogo'], { 
        queryParams: { search: query.trim() } 
      });
    }
  }
}
