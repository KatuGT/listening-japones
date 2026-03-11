export interface Video {
    id: string;
    title: string;
    description?: string;
    thumbnail_url?: string;
    video_url: string;
    difficulty: number;
    created_at: string;
}
