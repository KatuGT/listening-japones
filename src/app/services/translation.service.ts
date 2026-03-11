import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class TranslationService {

    public async translateText(japaneseText: string, contextBefore: string = '', contextAfter: string = ''): Promise<string> {
        try {
            // Hacemos una petición HTTP a nuestra función Serverless segura
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: japaneseText, contextBefore, contextAfter })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en el servidor de traducción.');
            }

            const data = await response.json();
            return data.translation;
        } catch (error) {
            console.error('Error al contactar con la API de traducción:', error);
            throw error;
        }
    }
}
