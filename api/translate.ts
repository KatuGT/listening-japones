import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_KEY || '';
    
    // Enable CORS to allow direct connection bypassing the Angular proxy if needed later
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // --- AUTHENTICATION & AUTHORIZATION ---
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('[API Translate] Intento de acceso sin token');
            return res.status(401).json({ error: 'No autorizado. Falta token de sesión.' });
        }
        
        const token = authHeader.split(' ')[1];
        
        if (!supabaseUrl || !supabaseKey) {
            console.error('[API Translate] Variables de entorno de Supabase no configuradas.');
            return res.status(500).json({ error: 'Configuración de servidor incompleta.' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Verificar token con Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            console.error('[API Translate] Token inválido o expirado', authError?.message);
            return res.status(401).json({ error: 'Sesión inválida o expirada.' });
        }

        // Verificar rol en la tabla profiles
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'colaborador')) {
            console.error(`[API Translate] Usuario ${user.id} intentó usar IA sin permisos. Rol actual: ${profile?.role}`);
            return res.status(403).json({ error: 'No tienes los permisos necesarios para usar esta función.' });
        }
        // --- FIN AUTH ---

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
            model: googleProvider('gemini-1.5-flash'),
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

