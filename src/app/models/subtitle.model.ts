export interface SubtitlesLine {
    start: number;
    end: number;
    text: string;
    translation?: string;
}

export interface SubtitlesData {
    id: string;
    video_id: string;
    subtitles_json: SubtitlesLine[];
    created_at: string;
}
