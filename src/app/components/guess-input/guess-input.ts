import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ListeningService } from '../../services/listening.service';
import { KanjiParserService } from '../../services/kanji-parser';
import { toHiragana } from 'wanakana';

export interface LineState {
  subtitle: any;
  guess: string;
  score: number | null;
  targetHiragana: string;
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
      targetHiragana: this.kanjiParser.toHiragana(sub.text)
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
    const s1 = target.trim();
    const s2 = guess.trim();

    if (s1 === s2) return 100;

    // Si la diferencia es de un solo carácter en lecturas comunes (como kata/hou)
    // podríamos ser más permisivos, pero por ahora Levenshtein estricto
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
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
}
