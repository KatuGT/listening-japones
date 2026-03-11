import { Injectable } from '@angular/core';

export interface JishoResult {
  slug: string;
  is_common: boolean;
  jlpt: string[];
  japanese: Array<{
    word?: string;
    reading?: string;
  }>;
  senses: Array<{
    english_definitions: string[];
    parts_of_speech: string[];
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class JishoService {
  private cache = new Map<string, JishoResult | null>();

  async search(keyword: string): Promise<JishoResult | null> {
    if (!keyword) return null;
    
    // Check cache
    if (this.cache.has(keyword)) {
      return this.cache.get(keyword) || null;
    }

    try {
      // Jisho API endpoint
      // Usamos un proxy CORS porque la API oficial de Jisho no tiene headers de CORS para navegadores
      const url = `https://api.jisho.org/api/v1/search/words?keyword=${encodeURIComponent(keyword)}`;
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      
      if (data && data.data && data.data.length > 0) {
        // Tomamos el primer resultado que es el más relevante
        const bestMatch = data.data[0] as JishoResult;
        this.cache.set(keyword, bestMatch);
        return bestMatch;
      }
      
      this.cache.set(keyword, null);
      return null;
    } catch (error) {
      console.error('Error fetching from Jisho:', error);
      return null;
    }
  }
}
