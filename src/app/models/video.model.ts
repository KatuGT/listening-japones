export interface Video {
    id: string;
    title: string;
    description?: string;
    thumbnail_url?: string;
    video_url: string;
    difficulty: number;
    media_format?: string;
    created_at: string;
}
