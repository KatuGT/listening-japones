# Configuración de Base de Datos y Storage en Supabase

Para que el nuevo sistema de traducciones dinámicas funcione correctamente, necesitamos crear las tablas donde se guardarán los videos y el contenido de los subtítulos (en formato JSON), además del espacio donde se guardarán los archivos `.mp4`.

Por favor, ve al **[SQL Editor en el dashboard de Supabase](https://supabase.com/dashboard/project/_/sql/)** de tu proyecto recién creado. Pega y ejecuta el siguiente bloque de código completo cliqueando en el botón verde **"Run"**.

```sql
-- 1. Crear tabla para almacenar información del Video
CREATE TABLE videos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  video_url text NOT NULL,
  difficulty integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Crear tabla para almacenar los subtítulos asociados al video
-- Guardamos el JSON completo aquí por facilidad de edición en el panel
CREATE TABLE subtitles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  subtitles_json jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar [RLS] Row Level Security (Seguridad Básica)
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtitles ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para permitir que TODOS (usuarios no logueados) PUEDAN LEER los datos
CREATE POLICY "Permitir lectura publica de videos" ON videos FOR SELECT USING (true);
CREATE POLICY "Permitir lectura publica de subs" ON subtitles FOR SELECT USING (true);

-- 5. Crear el Bucket de Storage para subir los MP4
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);

-- 6. Políticas del Bucket: Todos pueden descargar, solo los autenticados pueden subir
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'media' );
CREATE POLICY "Authenticated Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'media' );
```

Una vez que Vercel te confirme que las _queries_ se ejecutaron exitosamente, avísame y continuaremos conectando tu aplicación de Angular a la base de datos descargando la librería oficial de Supabase.
