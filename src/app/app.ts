import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VideoPlayerComponent } from './components/video-player/video-player';
import { ListeningService } from './services/listening.service';
import { GuessInput } from './components/guess-input/guess-input';
import { KanjiParserService } from './services/kanji-parser';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, VideoPlayerComponent, GuessInput],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'listening-japones';

  protected listeningService = inject(ListeningService);
  protected kanjiParser = inject(KanjiParserService);

  onTimeUpdate(time: number) {
    this.listeningService.currentTime.set(time);
  }

  constructor() {
    this.listeningService.loadSubtitles('/assets/kimetsu-t4e1/kimetsu-t4e1-sub.vtt')
  }
}
