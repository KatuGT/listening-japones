import { inject, Injectable, signal, computed } from "@angular/core";
import { SupabaseService } from './supabase.service';
import { Video } from '../models/video.model';

export interface Subtitle {
    start: number;
    end: number;
    text: string;
}

@Injectable({
    providedIn: 'root'
})
export class ListeningService {

    private supabaseService = inject(SupabaseService);

    currentTime = signal(0);
    // Señal especial para pedirle al reproductor de video que salte a un momento
    requestSeek = signal<number | null>(null);
    
    // Señal para resaltar los botones de replay (hover sync)
    highlightReplay = signal(false);
    
    // Progreso
    currentScore = signal(0);
    isEvaluated = signal(false); // <--- Nuevo estado global para saber si el usuario ya terminó
    // Opciones de UI
    showSubtitles = signal(false);
    subtitlesType = signal<'hiragana' | 'kanji'>('kanji');

    allSubtitles = signal<Subtitle[]>([]);
    scores = signal<number[]>([]);

    currentVideo = signal<Video | null>(null);
    isLoading = signal(false); // Cambiado a false por defecto para evitar flash si hay caché
    error = signal<string | null>(null);

    // Caché para videos individuales (Detalles + Subtítulos)
    private videoCache = new Map<string, { video: Video, subtitles: Subtitle[] }>();

    // Estado global para el catálogo (similar a SWR/React Query)
    videos = signal<Video[]>([]);
    hasLoadedCatalog = signal(false);

    // Estado global para el home
    homeVideos = signal<Video[]>([]);
    hasLoadedHome = signal(false);

    // Estado global para el panel de administración
    adminVideos = signal<any[]>([]);
    hasLoadedAdmin = signal(false);

    addScore(score: number) {
        this.scores.update(s => [...s, score]);
        
        // Persistir en Supabase si hay un video cargado
        const video = this.currentVideo();
        if (video) {
            this.supabaseService.saveScore({
                video_id: video.id,
                video_title: video.title,
                score: score
            });
        }
    }

    averageScore = computed(() => {
        const s = this.scores();
        if (s.length === 0) return 0;
        return Math.round(s.reduce((a, b) => a + b, 0) / s.length);
    });

    async loadVideoBySlug(slug: string) {
        // 0. Verificar si ya tenemos esto en caché (Optimización SWR-like)
        if (this.videoCache.has(slug)) {
            const cached = this.videoCache.get(slug)!;
            this.currentVideo.set(cached.video);
            this.allSubtitles.set(cached.subtitles);
            this.isLoading.set(false);
            return;
        }

        this.isLoading.set(true);
        this.error.set(null);
        this.allSubtitles.set([]);

        try {
            // 1. Fetch metadata by slug
            const videoData = await this.supabaseService.getVideoBySlug(slug);
            this.currentVideo.set(videoData);

            // 2. Fetch subtitles by the actual ID
            const subData = await this.supabaseService.getSubtitlesByVideoId(videoData.id);
            if (subData && subData.subtitles_json) {
                this.allSubtitles.set(subData.subtitles_json);
            }
            // 3. Guardar en caché para la próxima vez
            this.videoCache.set(slug, {
                video: videoData as Video,
                subtitles: subData?.subtitles_json || []
            });

        } catch (err: any) {
            console.error('Error loading video data:', err);
            this.error.set(err.message || 'Error cargando los datos del video.');
        } finally {
            this.isLoading.set(false);
        }
    }

    private parseVTT(text: string): Subtitle[] {
        const lines = text.split('\n');
        const subs: Subtitle[] = [];

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(' --> ')) {
                const [startStr, endStr] = lines[i].split(' --> ');
                const content = lines[i + 1]; // La línea siguiente tiene el texto

                subs.push({
                    start: this.timeToSeconds(startStr),
                    end: this.timeToSeconds(endStr),
                    text: content
                });
            }
        }
        return subs;
    }

    private timeToSeconds(timeStr: string): number {
        const [hhmmss, ms] = timeStr.trim().split('.');
        const [hh, mm, ss] = hhmmss.split(':').map(Number);
        return (hh * 3600) + (mm * 60) + ss + (Number(ms) / 1000);
    }
}