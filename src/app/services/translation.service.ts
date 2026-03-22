import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class TranslationService {

    /**
     * Traduce texto de forma fluida (streaming).
     * Emite el texto acumulado cada vez que llega un nuevo fragmento.
     */
    public translateTextStream(japaneseText: string, contextBefore: string = '', contextAfter: string = ''): Observable<string> {
        return new Observable<string>((observer) => {
            const controller = new AbortController();

            (async () => {
                try {
                    // LLamamos directo al puerto 3000 para evitar que el proxy de Angular agrupe (buffer) el streaming
                    const response = await fetch('http://localhost:3000/api/translate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
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
