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
          // Usamos .gzdata para evitar que Vercel intente descompimir o procesar el archivo
          const targetUrl = url.endsWith('.gz') ? `${url}data` : url;
          const res = await fetch('/assets/dict/' + targetUrl);
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

  tokenizeForDisplay(text: string): Array<{ surface: string, reading: string | null, isKanji: boolean, base_form?: string, pos?: string }> {
    if (!this.isReady() || !this.tokenizer) return [{ surface: text, reading: null, isKanji: false }];

    let clean = text.replace(/［/g, '[').replace(/］/g, ']');
    const bridgeRegex = /([^\[\]\s]+)\s*\[([^\]]+)\]/g;
    const parts = clean.split(bridgeRegex);

    let results: Array<{ surface: string, reading: string | null, isKanji: boolean, base_form?: string, pos?: string }> = [];

    const posMap: Record<string, string> = {
      '名詞': 'Sustantivo',
      '動詞': 'Verbo',
      '形容詞': 'Adjetivo',
      '副詞': 'Adverbio',
      '助詞': 'Partícula',
      '助動詞': 'Verbo aux.',
      '連体詞': 'Pronombre atr.',
      '接続詞': 'Conjunción',
      '感動詞': 'Interjección',
      '記号': 'Símbolo',
      'フィラー': 'Muletilla'
    };

    for (let i = 0; i < parts.length; i += 3) {
      const normalPart = parts[i];
      if (normalPart) {
        const tokens = this.tokenizer.tokenize(normalPart);
        const mappedTokens = tokens.map((t: any) => {
          const surface = t.surface_form;
          const reading = t.reading ? this.katakanaToHiragana(t.reading) : null;
          const isKanji = this.containsKanji(surface);
          // Omitimos la lectura si es igual a la superficie en hiragana puro
          const finalReading = (isKanji && surface !== reading) ? reading : null;
          const pos_es = t.pos ? (posMap[t.pos] || 'Otro') : 'Desconocido';
          
          return { 
            surface, 
            reading: finalReading, 
            isKanji,
            base_form: (t.basic_form && t.basic_form !== '*') ? t.basic_form : surface,
            pos: pos_es
          };
        });
        results = results.concat(mappedTokens);
      }

      if (i + 1 < parts.length) {
        const kanji = parts[i + 1];
        const reading = parts[i + 2];
        results.push({ surface: kanji, reading, isKanji: true, base_form: kanji, pos: 'Manual' });
      }
    }

    return results;
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

