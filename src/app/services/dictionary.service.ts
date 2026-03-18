import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface DictionaryEntry {
  k: string[]; // Kanji writings
  r: string[]; // Readings (Kana)
  m: string[]; // Meanings (Spanish)
}

@Injectable({
  providedIn: 'root'
})
export class DictionaryService {
  private http = inject(HttpClient);
  private dictionaryData: DictionaryEntry[] = [];
  private isLoaded = false;

  async loadDictionary() {
    if (this.isLoaded) return;
    try {
      // En Angular v18+, los archivos en /public se sirven en la raíz
      this.dictionaryData = await firstValueFrom(
        this.http.get<DictionaryEntry[]>('/assets/dict/dictionary-spa.json')
      );
      this.isLoaded = true;
    } catch (error) {
      console.error('❌ Error cargando diccionario (intentando ruta alternativa):', error);
      // Fallback por si la configuración del server varía
      try {
        this.dictionaryData = await firstValueFrom(
          this.http.get<DictionaryEntry[]>('/dictionary-spa.json')
        );
        this.isLoaded = true;
      } catch (e) {
        console.error('❌ Fallback fallido:', e);
      }
    }
  }

  /**
   * Busca una palabra en el diccionario local.
   * Intenta coincidencia exacta con Kanji o con lectura.
   */
  async search(keyword: string): Promise<DictionaryEntry[]> {
    if (!this.isLoaded) {
      await this.loadDictionary();
    }

    if (!keyword) return [];
    
    const cleanKeyword = keyword.trim();
    if (!cleanKeyword) return [];

    // Filtramos el diccionario
    return this.dictionaryData.filter(entry => 
      entry.k.includes(cleanKeyword) || entry.r.includes(cleanKeyword)
    );
  }
}
