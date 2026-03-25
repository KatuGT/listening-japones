import { Component, inject, OnInit, computed, effect, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { VideoPlayerComponent } from '../../components/video-player/video-player';
import { GuessInput } from '../../components/guess-input/guess-input';
import { GuessInputSkeletonComponent } from '../../components/skeletons/guess-input-skeleton/guess-input-skeleton';
import { ListeningService } from '../../services/listening.service';
import { KanjiParserService } from '../../services/kanji-parser';
import { FeedbackService } from '../../services/feedback.service';
import { SeoService } from '../../services/seo.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [VideoPlayerComponent, GuessInput, GuessInputSkeletonComponent],
  templateUrl: './play.html',
  styleUrl: './play.scss',
})
export class Play implements OnInit {
  protected listeningService = inject(ListeningService);
  protected route = inject(ActivatedRoute);
  protected feedbackService = inject(FeedbackService);
  protected kanjiParser = inject(KanjiParserService);
  private seoService = inject(SeoService);
  protected authService = inject(AuthService);
  protected profileService = inject(ProfileService);
  private router = inject(Router);

  isAdmin = computed(() => this.profileService.isUserAdmin(this.authService.currentUser()));

  isParserReady = computed(() => this.kanjiParser.isReady());

  relatedVideos = signal<any[]>([]);
  private supabaseService = inject(SupabaseService);

  constructor() {
    effect(() => {
      const video = this.listeningService.currentVideo();
      if (video) {
        this.seoService.updateTags({
          title: video.title,
          description: `Practica tu escucha con este video: ${video.title}. Dificultad: ${video.difficulty || 'N/A'}`,
          image: video.thumbnail_url || '/assets/images/open-graph-whatsapp.webp',
          type: 'video.other',
          url: `/play/${video.slug}`
        });
        
        // Cargar videos relacionados de la misma categoría
        if (video.media_format) {
           this.loadRelatedVideos(video.media_format, video.id);
        }
      }
    });
  }

  async loadRelatedVideos(format: string, currentId: string) {
    try {
      // Obtenemos un numero razonable de la misma categoría
      const { data } = await this.supabaseService.getVideos({ mediaFormat: format, limit: 15 });
      if (data) {
        // Filtramos el video actual
        const filtered = data.filter((v: any) => v.id !== currentId);
        // Hacemos shuffle (orden aleatorio)
        const shuffled = filtered.sort(() => 0.5 - Math.random());
        // Nos quedamos con 4
        this.relatedVideos.set(shuffled.slice(0, 4));
      }
    } catch (err) {
      console.error('Error loading related videos', err);
    }
  }

  reportError() {
    const video = this.listeningService.currentVideo();
    this.feedbackService.open('error', video?.id, video?.title);
  }

  goToEdit() {
    const video = this.listeningService.currentVideo();
    if (video) {
      this.router.navigate(['/admin'], { queryParams: { edit: video.id } });
    }
  }

  goToVideo(slug: string) {
    this.router.navigate(['/play', slug]);
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      if (slug) {
        this.listeningService.loadVideoBySlug(slug);
      }
    });
  }
}
