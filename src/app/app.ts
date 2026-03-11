import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { KanjiParserService } from './services/kanji-parser';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'listening-japones';
  protected kanjiParser = inject(KanjiParserService);

  constructor() {
    // KanjiParser will initialize itself, loading dictionaries once
  }
}
