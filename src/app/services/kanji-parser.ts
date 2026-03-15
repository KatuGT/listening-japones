import { Injectable, signal } from '@angular/core';
import * as kuromoji from '@patdx/kuromoji';

@Injectable({
  providedIn: 'root'
})
export class KanjiParserService {
  private tokenizer: any;
  isReady = signal(false);

  // Caché para evitar procesar lo mismo mil veces
  private hiraganaCache = new Map<string, string>();
  private tokenCache = new Map<string, any[]>();

  constructor() {
    this.initTokenizer();
  }

  private async initTokenizer() {
    try {
      // Cargador personalizado para usar 'fetch' en lugar de la lógica de Node.js
      const myLoader = {
        async loadArrayBuffer(url: string): Promise<ArrayBufferLike> {
          // Usamos .db para engañar a Vercel y que no intente optimizar el archivo binario
          const targetUrl = url.endsWith('.gz') ? `${url.replace('.gz', '.db')}` : url;
          const res = await fetch('/assets/dict/' + targetUrl);
          if (!res.ok) throw new Error(`Fallo al cargar diccionario: ${url}`);
          
          // Como los archivos .db son en realidad .gz, los descomprimimos al vuelo
          // usando la API nativa del navegador DecompressionStream.
          const ds = new DecompressionStream('gzip');
          const decompressedStream = res.body!.pipeThrough(ds);
          return await new Response(decompressedStream).arrayBuffer();
        }
      };

      const builder = new kuromoji.TokenizerBuilder({
        loader: myLoader as any
      });

      // Timeout de seguridad: si en 15 segundos no cargan los diccionarios,
      // desbloqueamos la UI para que el usuario pueda al menos ver los videos.
      const timeout = setTimeout(() => {
        if (!this.isReady()) {
          console.warn('Timeout alcanzado: Desbloqueando UI sin Kuromoji activo.');
          this.isReady.set(true);
        }
      }, 15000);

      try {
        console.log('Iniciando carga de diccionarios (.db)...');
        this.tokenizer = await builder.build();
        clearTimeout(timeout);
        this.isReady.set(true);
        console.log('Diccionarios cargados con éxito.');
      } catch (err: any) {
        clearTimeout(timeout);
        console.error('Error al inicializar Kuromoji:', err);
        // Desbloqueamos de todos modos para no matar la experiencia de usuario
        this.isReady.set(true);
      }
    } catch (err) {
      console.error('Error fatal detectado:', err);
      this.isReady.set(true);
    }
  }

  toHiragana(text: string): string {
    if (!this.isReady() || !this.tokenizer) return text;
    
    // Si ya lo procesamos antes, devolvemos el resultado del caché
    if (this.hiraganaCache.has(text)) {
      return this.hiraganaCache.get(text)!;
    }

    // 1. Normalizar corchetes (full-width a half-width)
    let clean = text.replace(/［/g, '[').replace(/］/g, ']');

    // 2. Dividir el texto en partes de "override" y "texto normal"
    const bridgeRegex = /([^\[\]\s]+)\s*\[([^\]]+)\]/g;
    const parts = clean.split(bridgeRegex);
    
    let result = '';
    for (let i = 0; i < parts.length; i += 3) {
      const normalPart = parts[i];
      if (normalPart) {
        // Optimización: Si no hay Kanji ni Katakana, no hace falta tokenizar
        if (!this.containsKanji(normalPart) && !this.containsKatakana(normalPart)) {
          result += normalPart.replace(/[、。！？\s]/g, '');
        } else {
          const tokens = this.tokenizer.tokenize(normalPart.replace(/[、。！？\s]/g, ''));
          result += tokens.map((t: any) => {
            if (t.reading) return this.katakanaToHiragana(t.reading);
            if (this.containsKanji(t.surface_form)) return '';
            return t.surface_form;
          }).join('');
        }
      }

      if (i + 1 < parts.length) {
        result += parts[i + 2].replace(/\s/g, ''); 
      }
    }
    
    this.hiraganaCache.set(text, result);
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

    if (this.tokenCache.has(text)) {
      return this.tokenCache.get(text)!;
    }

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
        // Si no hay Kanji ni Katakana, podemos crear un token simple sin ir al tokenizer
        if (!this.containsKanji(normalPart) && !this.containsKatakana(normalPart)) {
          results.push({ surface: normalPart, reading: null, isKanji: false, pos: 'Texto' });
        } else {
          const tokens = this.tokenizer.tokenize(normalPart);
          const mappedTokens = tokens.map((t: any) => {
            const surface = t.surface_form;
            const reading = t.reading ? this.katakanaToHiragana(t.reading) : null;
            const isKanji = this.containsKanji(surface);
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
      }

      if (i + 1 < parts.length) {
        const kanji = parts[i + 1];
        const reading = parts[i + 2];
        results.push({ surface: kanji, reading, isKanji: true, base_form: kanji, pos: 'Manual' });
      }
    }

    this.tokenCache.set(text, results);
    return results;
  }

  private containsKanji(text: string): boolean {
    return /[\u4e00-\u9faf]/.test(text);
  }

  private containsKatakana(text: string): boolean {
    return /[\u30a1-\u30f6]/.test(text);
  }

  private katakanaToHiragana(src: string): string {
    return src.replace(/[\u30a1-\u30f6]/g, (match) => {
      return String.fromCharCode(match.charCodeAt(0) - 0x60);
    });
  }
}

