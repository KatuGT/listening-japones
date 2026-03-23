import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface VideoFilters {
    onlyActive?: boolean;
    searchQuery?: string;
    mediaFormat?: string;
    difficulty?: number;
    limit?: number;
    offset?: number;
}

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_KEY);
    }



    // Videos
    async getVideos(filters: VideoFilters = {}) {
        let query = this.supabase
            .from('videos')
            .select('*', { count: 'exact' })
            .eq('is_approved', true)
            .order('created_at', { ascending: false });

        if (filters.onlyActive) {
            query = query.eq('is_active', true);
        }

        if (filters.searchQuery) {
            // Buscamos en el título o en la descripción
            query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
        }

        if (filters.mediaFormat && filters.mediaFormat !== 'Todos') {
            query = query.eq('media_format', filters.mediaFormat);
        }

        if (filters.difficulty && filters.difficulty > 0) {
            query = query.eq('difficulty', filters.difficulty);
        }

        if (filters.limit !== undefined && filters.offset !== undefined) {
             query = query.range(filters.offset, filters.offset + filters.limit - 1);
        } else if (filters.limit !== undefined) {
             query = query.limit(filters.limit);
        }

        const { data, error, count } = await query;
        if (error) throw error;
        return { data: data as any[], count };
    }

    async getVideoById(id: string) {
        const { data, error } = await this.supabase
            .from('videos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    async getVideoBySlug(slug: string) {
        const { data, error } = await this.supabase
            .from('videos')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error) throw error;
        return data;
    }

    async isTitleTaken(title: string): Promise<boolean> {
        const { data, error } = await this.supabase
            .from('videos')
            .select('id')
            .eq('title', title)
            .maybeSingle();
        
        if (error) throw error;
        return !!data;
    }

    async deleteVideo(id: string) {
        const { error } = await this.supabase
            .from('videos')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async updateVideo(id: string, updateData: any) {
        const { data, error } = await this.supabase
            .from('videos')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Subtitles
    async getSubtitlesByVideoId(videoId: string) {
        const { data, error } = await this.supabase
            .from('subtitles')
            .select('*')
            .eq('video_id', videoId)
            .single();

        // If no subtitles exist yet, handle gracefully
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    // Storage
    getPublicMediaUrl(path: string) {
        const { data } = this.supabase.storage.from('media').getPublicUrl(path);
        return data.publicUrl;
    }

    async uploadVideoToStorage(path: string, file: File) {
        const { data, error } = await this.supabase.storage.from('media').upload(path, file);
        if (error) throw error;
        return data;
    }

    // Admin DB Inserts
    async insertVideo(videoData: any) {
        const { data: { user } } = await this.supabase.auth.getUser();
        
        const { data, error } = await this.supabase
            .from('videos')
            .insert({
                ...videoData,
                author_id: user?.id
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async getAdminVideos() {
        // Obtenemos todos los videos con el profile del autor
        // Usamos profiles!author_id para ser explícitos con la clave foránea
        const { data, error } = await this.supabase
            .from('videos')
            .select('*, profiles!author_id(email)')
            .order('created_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        return data;
    }

    async approveVideo(id: string) {
        const { error } = await this.supabase
            .from('videos')
            .update({ is_approved: true })
            .eq('id', id);
        
        if (error) throw error;
    }

    async insertSubtitles(subData: any) {
        const { data, error } = await this.supabase
            .from('subtitles')
            .insert(subData)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateSubtitles(videoId: string, subsJson: any) {
        const { data, error } = await this.supabase
            .from('subtitles')
            .update({ subtitles_json: subsJson })
            .eq('video_id', videoId)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async deleteSubtitles(videoId: string) {
        const { error } = await this.supabase
            .from('subtitles')
            .delete()
            .eq('video_id', videoId);
        if (error) throw error;
    }

    // Auth Wrappers
    async signInWithGoogle() {
        // Redirigimos a la pantalla actual ('last screen') para que la experiencia sea fluida.
        // Para que esto funcione en producción, recuerda el comodín '/**' en Supabase.
        const redirectUrl = window.location.origin + window.location.pathname;

        const { data, error } = await this.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl
            }
        });
        if (error) throw error;
        return data;
    }

    async signOut() {
        const { error } = await this.supabase.auth.signOut();
        if (error) throw error;
    }

    getUser() {
        return this.supabase.auth.getUser();
    }

    async getSession() {
        const { data, error } = await this.supabase.auth.getSession();
        if (error) throw error;
        return data.session;
    }

    onAuthStateChange(callback: (event: any, session: any) => void) {
        return this.supabase.auth.onAuthStateChange(callback);
    }

    // Feedback
    async submitFeedback(feedback: { video_id?: string, video_title?: string, type: string, content: string }) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user) throw new Error('Usuario no autenticado');

        const { data, error } = await this.supabase
            .from('feedback')
            .insert({
                ...feedback,
                user_id: user.id
            })
            .select()
            .single();

        if (error) throw error;
    }

    async verifyCaptchaAndSubmitFeedback(token: string, feedback: any) {
        const { data, error } = await this.supabase.functions.invoke('verify-captcha', {
            body: { token, feedback }
        });

        if (error) throw error;
        return data;
    }

    // Scores
    async saveScore(scoreData: { video_id: string, video_title: string, score: number }) {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user) return;

        // Check if there's already a score for this video
        const { data: existing } = await this.supabase
            .from('user_scores')
            .select('*')
            .eq('user_id', user.id)
            .eq('video_id', scoreData.video_id)
            .maybeSingle();

        if (existing) {
            if (scoreData.score > existing.score) {
                await this.supabase
                    .from('user_scores')
                    .update({ score: scoreData.score })
                    .eq('id', existing.id);
            }
        } else {
            await this.supabase
                .from('user_scores')
                .insert({
                    ...scoreData,
                    user_id: user.id
                });
        }
    }

    async getUserHighScores() {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await this.supabase
            .from('user_scores')
            .select('*')
            .eq('user_id', user.id)
            .order('score', { ascending: false });

        if (error) throw error;
        return data;
    }

    async getUserFeedback() {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await this.supabase
            .from('feedback')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    async getPublicFeedback() {
        const { data, error } = await this.supabase
            .from('feedback')
            .select('*, profiles!user_id(nickname)')
            .eq('is_visible', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    async requestClip(request: { title: string, source_url?: string, description?: string }) {
        const { data: { user } } = await this.supabase.auth.getUser();
        
        const { data, error } = await this.supabase
            .from('clip_requests')
            .insert({
                ...request,
                user_id: user?.id || null
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getPublicClipRequests() {
        const { data, error } = await this.supabase
            .from('clip_requests')
            .select('*, profiles!user_id(nickname)')
            .eq('is_visible', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    async verifyCaptchaAndSubmitClipRequest(token: string, request: any) {
        const { data, error } = await this.supabase.functions.invoke('verify-captcha', {
            body: { token, clipRequest: request }
        });

        if (error) throw error;
        return data;
    }

    // --- Admin Methods ---

    async getAllFeedback() {
        const { data, error } = await this.supabase
            .from('feedback')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async updateFeedback(id: string, updates: any) {
        const { data, error } = await this.supabase
            .from('feedback')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async getAllProfiles() {
        const { data, error } = await this.supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async updateProfile(id: string, updates: any) {
        const { data, error } = await this.supabase
            .from('profiles')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async getProfile(id: string) {
        const { data, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        return data;
    }

    async checkNicknameAvailability(nickname: string) {
        const { data, error } = await this.supabase
            .from('profiles')
            .select('nickname')
            .eq('nickname', nickname)
            .maybeSingle();
        
        if (error) throw error;
        return !data; // Si no hay datos, está disponible
    }

    // --- Clip Requests Admin ---
    async getAllClipRequests() {
        const { data, error } = await this.supabase
            .from('clip_requests')
            .select('*, profiles!user_id(email, nickname)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async updateClipRequest(id: string, updates: any) {
        const { data, error } = await this.supabase
            .from('clip_requests')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }
}
