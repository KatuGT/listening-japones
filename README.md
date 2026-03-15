# Listening Japonés 🎧🇯🇵

Bienvenido a **Listening Japonés**, una plataforma premium diseñada para mejorar la comprensión auditiva del idioma japonés a través de contenido real (anime, canciones, noticias) con transcripciones inteligentes y análisis morfológico en tiempo real.

## ✨ Características Principales

- **Transcripción Inteligente**: Sincronización precisa entre audio/video y texto.
- **Análisis Morfológico**: Integración con **Kuromoji** para identificar kanjis, lecturas y partes de la oración.
- **Sistema de Feedback**: Herramientas integradas para que los usuarios reporten errores o sugieran mejoras.
- **Panel de Administración**: Gestión completa de contenido y seguridad (reCAPTCHA v3).
- **Diseño Premium**: Interfaz moderna con animaciones fluidas (GSAP) y estética minimalista.

## 🛠️ Tech Stack

- **Frontend**: [Angular 19](https://angular.dev/) (Signals, Standalone Components, Flow Control Syntax).
- **Backend/DB**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + Edge Functions).
- **Animaciones**: [GSAP (GreenSock)](https://greensock.com/).
- **NLP**: [@patdx/kuromoji](https://github.com/takuyaa/kuromoji.js) para procesamiento de lenguaje natural japonés.
- **Despliegue**: [Vercel](https://vercel.com/).

## 🚀 Configuración Local

1. **Clonar el repositorio**:
   ```bash
   git clone <repo-url>
   cd listening-japones
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   - Copia el archivo `src/environments/environment.template.ts` a `src/environments/environment.ts`.
   - Completa las claves de Supabase y reCAPTCHA.
   > [!IMPORTANT]
   > El archivo `environment.ts` está en el `.gitignore` para proteger tus claves. Nunca lo subas a GitHub.

4. **Ejecutar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:4200](http://localhost:4200) en tu navegador.

## 🌍 Despliegue (Vercel)

El proyecto está configurado para desplegarse automáticamente en Vercel. 

- Usa el script `set-env.js` (ejecutado automáticamente en el `prebuild`) para inyectar las variables de entorno de Vercel en el build de Angular.
- El archivo `vercel.json` asegura que los diccionarios de Kuromoji no se corrompan durante la compresión de assets.

## 📝 Licencia

Este proyecto es para uso personal y educativo. Todos los derechos de los contenidos audiovisuales pertenecen a sus respectivos autores.
