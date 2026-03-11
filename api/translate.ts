import { GoogleGenerativeAI } from '@google/generative-ai';

// Instanciar fuera del handler principal (esto asume que GEMINI_API_KEY esta siempre presente)
// Pero para mejor manejo lo leeremos dentro, como estaba. Solo mejoraremos el log.
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('[API Translate] GEMINI_API_KEY is not set');
            return res.status(500).json({ error: 'API key no configurada' });
        }

        const { text, contextBefore, contextAfter } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Falta texto' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Use gemini-2.5-flash as the fast/text model
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Actúa como traductor de japonés experto en anime para un único subtítulo. Tu respuesta final debe ser EXCLUSIVAMENTE el subtítulo traducido al español neutral, sin absolutamente nada más (ni notas, ni pensamientos, ni explicaciones extra).
        
Contexto previo: "${contextBefore || ''}"
Línea a traducir: "${text}"
Contexto siguiente: "${contextAfter || ''}"

Traducción sugerida:`;

        console.log(`[API Translate] Solicitando traducción para: "${text.substring(0, 20)}..."`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const translatedText = response.text().trim();
        console.log(`[API Translate] Éxito. Traducción de "${text.substring(0, 10)}...": "${translatedText.substring(0, 15)}..."`);

        return res.status(200).json({ translation: translatedText });
    } catch (error: any) {
        console.error('[API Translate] Error:', error.message || error);
        return res.status(500).json({ error: error.message || 'Error desconocido' });
    }
}
