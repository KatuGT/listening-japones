import { Component, inject, OnInit, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { VideoPlayerComponent } from '../../components/video-player/video-player';
import { GuessInput } from '../../components/guess-input/guess-input';
import { GuessInputSkeletonComponent } from '../../components/skeletons/guess-input-skeleton/guess-input-skeleton';
import { ListeningService } from '../../services/listening.service';
import { KanjiParserService } from '../../services/kanji-parser';
import { FeedbackService } from '../../services/feedback.service';

@Component({
  selector: 'app-play',
  imports: [VideoPlayerComponent, GuessInput, GuessInputSkeletonComponent],
  templateUrl: './play.html',
  styleUrl: './play.scss',
})
export class Play implements OnInit {
  protected listeningService = inject(ListeningService);
  protected route = inject(ActivatedRoute);
  protected feedbackService = inject(FeedbackService);
  protected kanjiParser = inject(KanjiParserService);

  isParserReady = computed(() => this.kanjiParser.isReady());

  reportError() {
    const video = this.listeningService.currentVideo();
    this.feedbackService.open('error', video?.id, video?.title);
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
