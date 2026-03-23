import { Component, inject, OnInit, computed, effect } from '@angular/core';
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
      }
    });
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

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      if (slug) {
        this.listeningService.loadVideoBySlug(slug);
      }
    });
  }
}
