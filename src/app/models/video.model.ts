export interface Video {
    id: string;
    slug: string;
    title: string;
    description?: string;
    thumbnail_url?: string;
    video_url: string;
    full_video_url?: string;
    difficulty: number;
    media_format?: string;
    phrase_count: number;
    created_at: string;
    hide_subs: boolean;
}
