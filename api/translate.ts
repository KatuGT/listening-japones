import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Lazy-load everything to bypass the ESM/CJS module resolution issue
    const { createClient } = await import('@supabase/supabase-js');
    const { streamText } = await import('ai');
    const { createGoogleGenerativeAI } = await import('@ai-sdk/google');

    const supabaseUrl = process.env['SUPABASE_URL'] || '';
    const supabaseKey = process.env['SUPABASE_KEY'] || '';

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

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            console.error('[API Translate] Token inválido o expirado', authError?.message);
            return res.status(401).json({ error: 'Sesión inválida o expirada.' });
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'colaborador')) {
            console.error(`[API Translate] Sin permisos. Rol: ${profile?.role}`);
            return res.status(403).json({ error: 'No tienes permisos para usar esta función.' });
        }

        const apiKey = process.env['GEMINI_API_KEY'];
        if (!apiKey) {
            console.error('[API Translate] GEMINI_API_KEY no configurada');
            return res.status(500).json({ error: 'API key de Google no configurada' });
        }

        const googleProvider = createGoogleGenerativeAI({ apiKey });
        const { text, contextBefore, contextAfter } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Falta texto' });
        }

        const prompt = `Actúa como traductor de japonés experto en anime para un único subtítulo. Tu respuesta final debe ser EXCLUSIVAMENTE el subtítulo traducido al español neutral, sin absolutamente nada más (ni notas, ni pensamientos, ni explicaciones extra).
        
Contexto previo: "${contextBefore || ''}"
Línea a traducir: "${text}"
Contexto siguiente: "${contextAfter || ''}"

Traducción sugerida:`;

        console.log(`[API Translate] Solicitando a Gemini: "${text.substring(0, 30)}..."`);

        const result = streamText({
            model: googleProvider('gemini-2.5-flash'),
            prompt,
        });

        return result.pipeTextStreamToResponse(res as any);

    } catch (error: any) {
        console.error('[API Translate] Error:', error.message || error);
        if (!res.headersSent) {
            return res.status(500).json({ error: error.message || 'Error en el servidor' });
        }
        return res.end();
    }
}
