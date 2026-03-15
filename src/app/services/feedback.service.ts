import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  isOpen = signal(false);
  videoId = signal<string | undefined>(undefined);
  videoTitle = signal<string | undefined>(undefined);
  type = signal<'error' | 'sugerencia' | 'peticion'>('sugerencia');

  open(type: 'error' | 'sugerencia' | 'peticion' = 'sugerencia', videoId?: string, videoTitle?: string) {
    this.type.set(type);
    this.videoId.set(videoId);
    this.videoTitle.set(videoTitle);
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }
}
