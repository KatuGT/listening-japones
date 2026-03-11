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

    // 1. Normalizar corchetes (full-width a half-width)
    let clean = text.replace(/［/g, '[').replace(/］/g, ']');

    // 2. Dividir el texto en partes de "override" y "texto normal"
    const bridgeRegex = /([^\[\]\s]+)\s*\[([^\]]+)\]/g;
    const parts = clean.split(bridgeRegex);
    // split con un grupo de captura devuelve [previo, grupo1, grupo2, siguiente, ...]
    
    let result = '';
    for (let i = 0; i < parts.length; i += 3) {
      // Texto normal (o previo al override)
      const normalPart = parts[i];
      if (normalPart) {
        const tokens = this.tokenizer.tokenize(normalPart.replace(/[、。！？\s]/g, ''));
        result += tokens.map((t: any) => {
          if (t.reading) return this.katakanaToHiragana(t.reading);
          if (this.containsKanji(t.surface_form)) return '';
          return t.surface_form;
        }).join('');
      }

      // El override (si existe)
      if (i + 1 < parts.length) {
        // parts[i+1] es el Kanji (que ignoramos aquí)
        // parts[i+2] es la lectura manual (que usamos)
        result += parts[i + 2].replace(/\s/g, ''); 
      }
    }
    
    return result;
  }

  toFurigana(text: string): string {
    if (!this.isReady() || !this.tokenizer) return text;

    // 1. Normalizar corchetes
    let clean = text.replace(/［/g, '[').replace(/］/g, ']');

    // 2. Dividir por overrides
    const bridgeRegex = /([^\[\]\s]+)\s*\[([^\]]+)\]/g;
    const parts = clean.split(bridgeRegex);

    let result = '';
    for (let i = 0; i < parts.length; i += 3) {
      // Texto normal
      const normalPart = parts[i];
      if (normalPart) {
        const tokens = this.tokenizer.tokenize(normalPart);
        result += tokens.map((t: any) => {
          const surface = t.surface_form;
          const reading = t.reading ? this.katakanaToHiragana(t.reading) : null;
          if (reading && this.containsKanji(surface) && surface !== reading) {
            return `<ruby><rb>${surface}</rb><rt>${reading}</rt></ruby>`;
          }
          return surface;
        }).join('');
      }

      // El override
      if (i + 1 < parts.length) {
        const kanji = parts[i + 1];
        const reading = parts[i + 2];
        result += `<ruby><rb>${kanji}</rb><rt>${reading}</rt></ruby>`;
      }
    }

    return result;
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

