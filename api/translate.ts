import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export default async function handler(req: any, res: any) {
    // Enable CORS to allow direct connection bypassing the Angular proxy if needed later
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('[API Translate] GEMINI_API_KEY is not set');
            return res.status(500).json({ error: 'API key de Google no configurada' });
        }

        const googleProvider = createGoogleGenerativeAI({
            apiKey: apiKey,
        });

        const { text, contextBefore, contextAfter } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Falta texto' });
        }

        const prompt = `Actúa como traductor de japonés experto en anime para un único subtítulo. Tu respuesta final debe ser EXCLUSIVAMENTE el subtítulo traducido al español neutral, sin absolutamente nada más (ni notas, ni pensamientos, ni explicaciones extra).
        
Contexto previo: "${contextBefore || ''}"
Línea a traducir: "${text}"
Contexto siguiente: "${contextAfter || ''}"

Traducción sugerida:`;

        console.log(`[API Translate] Solicitando streaming a Gemini para: "${text.substring(0, 20)}..."`);

        const result = streamText({
            model: googleProvider('gemini-2.5-flash'),
            prompt: prompt,
        });

        // Exactamente el mismo método que usa Midudev en Express
        return result.pipeTextStreamToResponse(res);

    } catch (error: any) {
        console.error('[API Translate] Error:', error.message || error);
        if (!res.headersSent) {
            return res.status(500).json({ error: error.message || 'Error en el servidor de streaming' });
        }
        return res.end();
    }
}

