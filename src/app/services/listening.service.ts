import { HttpClient } from "@angular/common/http";
import { inject, Injectable, signal, computed } from "@angular/core";

export interface Subtitle {
    start: number;
    end: number;
    text: string;
}

@Injectable({
    providedIn: 'root'
})
export class ListeningService {

    private http = inject(HttpClient)

    currentTime = signal(0)

    showSubtitles = signal(false)

    subtitlesType = signal<'hiragana' | 'kanji'>('kanji')

    allSubtitles = signal<Subtitle[]>([])
    scores = signal<number[]>([])

    addScore(score: number) {
        this.scores.update(s => [...s, score]);
    }

    averageScore = computed(() => {
        const s = this.scores();
        if (s.length === 0) return 0;
        return Math.round(s.reduce((a, b) => a + b, 0) / s.length);
    })

    loadSubtitles(url: string) {
        this.http.get(url, { responseType: 'text' }).subscribe(vttText => {
            this.allSubtitles.set(this.parseVTT(vttText));
        });
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