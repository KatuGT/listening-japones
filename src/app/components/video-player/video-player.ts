import { Component, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListeningService } from '../../services/listening.service';

import { SubtitleDisplayComponent } from '../subtitle-display/subtitle-display';

@Component({
    selector: 'app-video-player',
    standalone: true,
    imports: [CommonModule, SubtitleDisplayComponent],
    templateUrl: './video-player.html',
    styleUrl: './video-player.scss'
})
export class VideoPlayerComponent {
    public listeningService = inject(ListeningService)

    videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoPlayer')

    isPlaying = signal(false);
    currentTime = signal(0);
    duration = signal(0);
    volume = signal(1);
    isMuted = signal(false);

    showSurrenderModal = signal(false);
    surrenderMessage = signal('');

    surrenderQuotes = [
        "¿Ya te rendiste tan rápido?",
        "¿Seguro que escuchaste con atención?",
        "¡Vamos, inténtalo una vez más!",
        "Un verdadero ninja no se rinde tan fácil..."
    ];

    videoSrc = '/assets/kimetsu-t4e1/kimetsu-t4e1-video.mp4';

    constructor() {
        effect(() => {
            const video = this.videoElement()?.nativeElement
            if (!video) return;

            if (this.isPlaying()) {
                video.play().catch(err => console.error('Error playing video:', err));
            } else {
                video.pause()
            }
        })
    }

    togglePlay() {
        this.isPlaying.update(value => !value);
    }

    onLoadedMetadata(event: Event) {
        const video = event.target as HTMLVideoElement;
        this.duration.set(video.duration);
    }

    onTimeUpdate(event: Event) {
        const video = event.target as HTMLVideoElement;
        this.currentTime.set(video.currentTime);
        this.listeningService.currentTime.set(video.currentTime);
    }

    onEnded() {
        this.currentTime.set(this.duration());
        this.isPlaying.set(false);
    }

    seek(event: Event) {
        const input = event.target as HTMLInputElement;
        const time = Number(input.value);
        const video = this.videoElement()?.nativeElement;
        if (video) {
            video.currentTime = time;
            this.currentTime.set(time);
        }
    }

    setVolume(event: Event) {
        const input = event.target as HTMLInputElement;
        const vol = Number(input.value);
        const video = this.videoElement()?.nativeElement;
        if (video) {
            video.volume = vol;
            this.volume.set(vol);
            this.isMuted.set(vol === 0);
        }
    }

    toggleMute() {
        const video = this.videoElement()?.nativeElement;
        if (video) {
            this.isMuted.update(m => !m);
            video.muted = this.isMuted();
        }
    }

    toggleSubtitles() {
        if (this.listeningService.showSubtitles()) {
            // Si están activos, simplemente los apagamos
            this.listeningService.showSubtitles.set(false);
        } else {
            // Si están apagados, mostramos el modal de "rendirse"
            this.isPlaying.set(false); // Pausamos el video para que decida

            // Elegir mensaje aleatorio
            const randIndex = Math.floor(Math.random() * this.surrenderQuotes.length);
            this.surrenderMessage.set(this.surrenderQuotes[randIndex]);

            this.showSurrenderModal.set(true);
        }
    }

    confirmSurrender() {
        this.showSurrenderModal.set(false);
        this.listeningService.showSubtitles.set(true);
    }

    cancelSurrender() {
        this.showSurrenderModal.set(false);
        this.isPlaying.set(true); // Reanudamos el video
    }

    formatTime(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return [
            h > 0 ? h : null,
            m.toString().padStart(h > 0 ? 2 : 1, '0'),
            s.toString().padStart(2, '0')
        ].filter(v => v !== null).join(':');
    }
}
