import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ListeningService } from '../../services/listening.service';
import { KanjiParserService } from '../../services/kanji-parser';
import { toHiragana } from 'wanakana';

import { TranslationService } from '../../services/translation.service';
import { JishoService, JishoResult } from '../../services/jisho.service';
import { DictionaryService, DictionaryEntry } from '../../services/dictionary.service';

export interface TargetToken {
  surface: string;
  reading: string | null;
  isKanji: boolean;
  base_form?: string;
  pos?: string;
  isLoadingJisho?: boolean;
  jishoLoaded?: boolean;
  jishoData?: JishoResult | null;
  spanishLoaded?: boolean;
  spaData?: DictionaryEntry[] | null;
}

export interface LineState {
  subtitle: any;
  guess: string;
  score: number | null;
  targetHiragana: string;
  targetTokens: TargetToken[];
  translation?: string;
  isTranslating?: boolean;
  showTranslation?: boolean;
}

@Component({
  selector: 'app-guess-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guess-input.html',
  styleUrl: './guess-input.scss',
})
export class GuessInput implements OnInit {
  public listeningService = inject(ListeningService);
  private kanjiParser = inject(KanjiParserService);
  public translationService = inject(TranslationService);
  public jishoService = inject(JishoService);
  public dictionaryService = inject(DictionaryService);

  lines = signal<LineState[]>([]);

  // Inicializamos las líneas automáticamente cuando cambian los subtítulos
  ngOnInit() {
    this.setupReactivity();
  }

  private setupReactivity() {
    const subs = this.listeningService.allSubtitles();
    if (subs.length > 0) {
      this.initLines(subs);
    }
  }

  private initLines(subs: any[]) {
    const initialLines = subs.map(sub => ({
      subtitle: sub,
      guess: '',
      score: null,
      targetHiragana: this.kanjiParser.toHiragana(sub.text),
      targetTokens: this.kanjiParser.tokenizeForDisplay(sub.text),
      translation: sub.translation || '',
      isTranslating: false,
      showTranslation: false
    }));
    this.lines.set(initialLines);
    this.listeningService.isEvaluated.set(false);
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

    this.listeningService.isEvaluated.set(true);
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

  // --- Translation Toggle Logic ---

  toggleTranslation(index: number) {
    this.lines.update(current => {
      const updated = [...current];
      updated[index] = { ...updated[index], showTranslation: !updated[index].showTranslation };
      return updated;
    });
  }

  // --- Audio Replay Logic ---
  
  replayLine(index: number) {
    const line = this.lines()[index];
    if (line && line.subtitle) {
      this.listeningService.requestSeek.set(line.subtitle.start);
    }
  }

  // --- Jisho Tooltip Logic ---

  async onKanjiHover(lineIndex: number, tokenIndex: number) {
    const lines = this.lines();
    const token = lines[lineIndex].targetTokens[tokenIndex];
    if (token.jishoLoaded || token.isLoadingJisho) return;

    // Set loading
    this.lines.update(current => {
      const newLines = [...current];
      const newTokens = [...newLines[lineIndex].targetTokens];
      newTokens[tokenIndex] = { ...newTokens[tokenIndex], isLoadingJisho: true };
      newLines[lineIndex] = { ...newLines[lineIndex], targetTokens: newTokens };
      return newLines;
    });

    const keyword = token.base_form || token.surface;
    
    // Ejecutamos ambas búsquedas en paralelo
    const [jishoResult, spaResult] = await Promise.all([
      this.jishoService.search(keyword),
      this.dictionaryService.search(keyword)
    ]);

    // Fallback: si no hay resultados con base_form/surface, intentamos superficie original si es un compuesto
    let finalJisho = jishoResult;
    let finalSpa = spaResult;

    if (!finalJisho && !finalSpa && token.surface !== keyword) {
      const [retryJisho, retrySpa] = await Promise.all([
        this.jishoService.search(token.surface),
        this.dictionaryService.search(token.surface)
      ]);
      finalJisho = retryJisho;
      finalSpa = retrySpa;
    }

    // Set loaded
    this.lines.update(current => {
      const newLines = [...current];
      const newTokens = [...newLines[lineIndex].targetTokens];
      
      const foundSpa = finalSpa && finalSpa.length > 0;
      const foundJisho = !!finalJisho;

      newTokens[tokenIndex] = { 
         ...newTokens[tokenIndex], 
         isLoadingJisho: false,
         jishoLoaded: true,
         jishoData: finalJisho,
         spanishLoaded: true,
         spaData: foundSpa ? finalSpa : null
      };
      
      console.log(`Token [${token.surface}] final status:`, { foundSpa, foundJisho });
      
      newLines[lineIndex] = { ...newLines[lineIndex], targetTokens: newTokens };
      return newLines;
    });
  }
}
