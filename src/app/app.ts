import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { KanjiParserService } from './services/kanji-parser';
import { NavbarComponent } from './components/navbar/navbar';
import { FooterComponent } from './components/footer/footer';
import { FeedbackComponent } from './components/feedback/feedback';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FooterComponent, FeedbackComponent],
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
