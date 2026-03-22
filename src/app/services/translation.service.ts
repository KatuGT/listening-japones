import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class TranslationService {
    private supabase = inject(SupabaseService);

    /**
     * Traduce texto de forma fluida (streaming).
     * Emite el texto acumulado cada vez que llega un nuevo fragmento.
     */
    public translateTextStream(japaneseText: string, contextBefore: string = '', contextAfter: string = ''): Observable<string> {
        return new Observable<string>((observer) => {
            const controller = new AbortController();

            (async () => {
                try {
                    // Obtener token de sesión actual
                    const session = await this.supabase.getSession();
                    const token = session?.access_token || '';

                    // LLamamos a la API usando la URL del entorno
                    const response = await fetch(environment.translateApiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ text: japaneseText, contextBefore, contextAfter }),
                        signal: controller.signal
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Error ${response.status}: ${errorText}`);
                    }

                    const reader = response.body?.getReader();
                    const decoder = new TextDecoder();
                    let fullText = '';

                    if (!reader) {
                        throw new Error('Cuerpo de respuesta no disponible');
                    }

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        fullText += chunk;
                        observer.next(fullText);
                    }

                    observer.complete();
                } catch (error: any) {
                    if (error.name !== 'AbortError') {
                        observer.error(error);
                    }
                }
            })();

            return () => controller.abort();
        });
    }

    /**
     * Versión clásica que devuelve una promesa (para compatibilidad).
     */
    public async translateText(japaneseText: string, contextBefore: string = '', contextAfter: string = ''): Promise<string> {
        return new Promise((resolve, reject) => {
            let lastValue = '';
            this.translateTextStream(japaneseText, contextBefore, contextAfter).subscribe({
                next: (val) => lastValue = val,
                error: (err) => reject(err),
                complete: () => resolve(lastValue)
            });
        });
    }
}
