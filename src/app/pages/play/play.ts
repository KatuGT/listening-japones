import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { VideoPlayerComponent } from '../../components/video-player/video-player';
import { GuessInput } from '../../components/guess-input/guess-input';
import { GuessInputSkeletonComponent } from '../../components/skeletons/guess-input-skeleton/guess-input-skeleton';
import { ListeningService } from '../../services/listening.service';

@Component({
  selector: 'app-play',
  imports: [VideoPlayerComponent, GuessInput, GuessInputSkeletonComponent],
  templateUrl: './play.html',
  styleUrl: './play.scss',
})
export class Play implements OnInit {
  protected listeningService = inject(ListeningService);
  protected route = inject(ActivatedRoute);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.listeningService.loadVideoData(id);
      }
    });
  }
}
