import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    }

    // Videos
    async getVideos(onlyActive: boolean = false) {
        let query = this.supabase
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false });

        if (onlyActive) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
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
        const { data, error } = await this.supabase
            .from('videos')
            .insert(videoData)
            .select()
            .single();
        if (error) throw error;
        return data;
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
        const { data, error } = await this.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/admin'
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

    onAuthStateChange(callback: (event: any, session: any) => void) {
        return this.supabase.auth.onAuthStateChange(callback);
    }
}
