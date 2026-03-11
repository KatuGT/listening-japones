import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ListeningService } from '../../services/listening.service';
import { KanjiParserService } from '../../services/kanji-parser';
import { toHiragana } from 'wanakana';

import { TranslationService } from '../../services/translation.service';

export interface LineState {
  subtitle: any;
  guess: string;
  score: number | null;
  targetHiragana: string;
  translation?: string;
  isTranslating?: boolean;
}

@Component({
  selector: 'app-guess-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guess-input.html',
  styleUrl: './guess-input.scss',
})
export class GuessInput {
  public listeningService = inject(ListeningService);
  private kanjiParser = inject(KanjiParserService);
  public translationService = inject(TranslationService);

  lines = signal<LineState[]>([]);
  isEvaluated = signal(false);

  // Inicializamos las líneas automáticamente cuando cambian los subtítulos
  constructor() {
    this.setupReactivity();
  }

  private setupReactivity() {
    // Usamos un intervalo para esperar a que Kuromoji y los subs estén listos
    const checkReady = setInterval(() => {
      if (this.kanjiParser.isReady()) {
        const subs = this.listeningService.allSubtitles();
        if (subs.length > 0) {
          this.initLines(subs);
          clearInterval(checkReady);
        }
      }
    }, 1000);
  }

  private initLines(subs: any[]) {
    const initialLines = subs.map(sub => ({
      subtitle: sub,
      guess: '',
      score: null,
      targetHiragana: this.kanjiParser.toHiragana(sub.text),
      translation: '',
      isTranslating: false
    }));
    this.lines.set(initialLines);
    this.isEvaluated.set(false);
  }

  activeLineIndex = computed(() => {
    const time = this.listeningService.currentTime();
    return this.lines().findIndex(line =>
      time >= line.subtitle.start && time <= line.subtitle.end
    );
  });

  currentClipAverage = computed(() => {
    const allLines = this.lines();
    if (allLines.length === 0) return 0;

    // Si la línea no fue intentada (score === null), cuenta como 0 para el promedio final
    const totalScore = allLines.reduce((sum, line) => sum + (line.score || 0), 0);
    return Math.round(totalScore / allLines.length);
  });

  updateGuess(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const converted = toHiragana(input.value, { IMEMode: true });

    this.lines.update(current => {
      const newLines = [...current];
      newLines[index] = { ...newLines[index], guess: converted };
      return newLines;
    });

    input.value = converted;
  }

  evaluateLine(index: number) {
    this.lines.update(current => {
      const newLines = [...current];
      const line = newLines[index];

      if (!line || !line.guess.trim()) {
        newLines[index] = { ...line, score: null };
        return newLines;
      }

      const score = this.calculateAccuracy(line.targetHiragana, line.guess.trim());
      newLines[index] = { ...line, score };
      return newLines;
    });
  }

  evaluateAll() {
    this.lines().forEach((line, i) => {
      if (line.guess.trim() && line.score === null) {
        this.evaluateLine(i);
      }
    });

    this.isEvaluated.set(true);
    const avg = this.currentClipAverage();
    if (avg > 0) {
      this.listeningService.addScore(avg);
    }
  }

  private calculateAccuracy(target: string, guess: string): number {
    // 1. Limpieza agresiva: quitar espacios, puntos y puntuación común
    // También normalizamos a minúsculas por si acaso (aunque en Hiragana no aplica)
    const cleanS1 = target.replace(/[\s、。！？.…]/g, '').toLowerCase();
    const cleanS2 = guess.replace(/[\s、。！？.…]/g, '').toLowerCase();

    if (cleanS1 === cleanS2) return 100;

    const longer = cleanS1.length > cleanS2.length ? cleanS1 : cleanS2;
    const shorter = cleanS1.length > cleanS2.length ? cleanS2 : cleanS1;
    if (longer.length === 0) return 100;

    const dist = this.levenshtein(longer, shorter);
    return Math.round(((longer.length - dist) / longer.length) * 100);
  }

  private levenshtein(s1: string, s2: string): number {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) costs[j] = j;
        else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  reset() {
    this.initLines(this.listeningService.allSubtitles());
  }

  // --- IA Translation Logic ---

  async translateLine(index: number) {
    const line = this.lines()[index];
    if (!line.subtitle.text) return;

    // Si ya existe una traducción guardada en el subtítulo (desde el admin), la usamos directamente
    if (line.subtitle.translation) {
      this.lines.update(current => {
        const updated = [...current];
        updated[index] = { ...line, translation: line.subtitle.translation };
        return updated;
      });
      return;
    }

    this.lines.update(current => {
      const updated = [...current];
      updated[index] = { ...line, isTranslating: true };
      return updated;
    });

    try {
      const contextBefore = index > 0 ? this.lines()[index - 1].subtitle.text : '';
      const contextAfter = index < this.lines().length - 1 ? this.lines()[index + 1].subtitle.text : '';

      // Pedimos a nuestro backend (Serverless) la traducción
      const translation = await this.translationService.translateText(
        line.subtitle.text,
        contextBefore,
        contextAfter
      );

      this.lines.update(current => {
        const updated = [...current];
        updated[index] = { ...updated[index], translation, isTranslating: false };
        return updated;
      });
    } catch (e) {
      console.error(e);
      this.lines.update(current => {
        const updated = [...current];
        updated[index] = { ...updated[index], translation: 'Error al traducir.', isTranslating: false };
        return updated;
      });
    }
  }
}
