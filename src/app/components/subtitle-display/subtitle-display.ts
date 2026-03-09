import { Component, inject, computed } from '@angular/core';
import { ListeningService } from '../../services/listening.service';
import { KanjiParserService } from '../../services/kanji-parser';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-subtitle-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subtitle-display.html',
  styleUrl: './subtitle-display.scss'
})
export class SubtitleDisplayComponent {
  private listeningService = inject(ListeningService);
  private kanjiParser = inject(KanjiParserService);
  private sanitizer = inject(DomSanitizer);

  currentSubtitle = computed(() => {
    // Agregamos la dependencia a isReady para que se re-calcule cuando el diccionario cargue
    const ready = this.kanjiParser.isReady();
    const time = this.listeningService.currentTime();

    const sub = this.listeningService.allSubtitles().find(s =>
      time >= s.start && time <= s.end
    );

    if (!sub) return null;

    // Si no está listo, devolvemos el texto plano, si está listo, procesamos Furigana
    const html = ready ? this.kanjiParser.toFurigana(sub.text) : sub.text;

    return {
      ...sub,
      safeHtml: this.sanitizer.bypassSecurityTrustHtml(html)
    };
  });

  show = this.listeningService.showSubtitles;
}
