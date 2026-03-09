import { Injectable, signal } from '@angular/core';
import * as kuromoji from '@patdx/kuromoji';

@Injectable({
  providedIn: 'root'
})
export class KanjiParserService {
  private tokenizer: any;
  isReady = signal(false);

  constructor() {
    this.initTokenizer();
  }

  private async initTokenizer() {
    try {
      // Cargador personalizado para usar 'fetch' en lugar de la lógica de Node.js
      const myLoader = {
        async loadArrayBuffer(url: string): Promise<ArrayBufferLike> {
          const res = await fetch('/assets/dict/' + url);
          if (!res.ok) throw new Error(`Fallo al cargar diccionario: ${url}`);
          return res.arrayBuffer();
        }
      };

      const builder = new kuromoji.TokenizerBuilder({
        loader: myLoader as any
      });

      this.tokenizer = await builder.build();
      this.isReady.set(true);
      console.log('¡Kuromoji Browser-Ready activo! 🚀');
    } catch (err) {
      console.error('Error al inicializar Kuromoji:', err);
    }
  }

  toHiragana(text: string): string {
    if (!this.isReady() || !this.tokenizer) return text;

    const tokens = this.tokenizer.tokenize(text.replace(/[、。！？]/g, ''));
    return tokens.map((token: any) => {
      if (token.reading) {
        return this.katakanaToHiragana(token.reading);
      }
      return token.surface_form;
    }).join('');
  }

  toFurigana(text: string): string {
    if (!this.isReady() || !this.tokenizer) return text;

    // Si tiene un override manual {lectura}, lo usamos como texto plano por ahora 
    // o podríamos intentar parsearlo si quisiéramos Furigana en el override.
    const overrideMatch = text.match(/\{([^}]+)\}/);
    if (overrideMatch) {
      return text.replace(/\{[^}]+\}/, '').trim();
    }

    const tokens = this.tokenizer.tokenize(text);
    console.log('Tokens Furigana:', tokens);

    return tokens.map((token: any) => {
      const surface = token.surface_form;
      const reading = token.reading ? this.katakanaToHiragana(token.reading) : null;

      // Si el token tiene Kanji, aplicamos Ruby
      if (reading && this.containsKanji(surface) && surface !== reading) {
        return `<ruby><rb>${surface}</rb><rt>${reading}</rt></ruby>`;
      }
      return surface;
    }).join('');
  }

  private containsKanji(text: string): boolean {
    return /[\u4e00-\u9faf]/.test(text);
  }

  private katakanaToHiragana(src: string): string {
    return src.replace(/[\u30a1-\u30f6]/g, (match) => {
      return String.fromCharCode(match.charCodeAt(0) - 0x60);
    });
  }
}

