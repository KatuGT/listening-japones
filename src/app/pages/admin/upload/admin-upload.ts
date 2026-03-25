import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';
import { TranslationService } from '../../../services/translation.service';
import { toHiragana } from 'wanakana';
import { TextInputComponent } from '../../../components/text-input/text-input';
import { TextareaInputComponent } from '../../../components/textarea-input/textarea-input';

export interface AdminSubtitleLine {
  start: number;
  end: number;
  text: string;
  translation: string;
  isTranslatingLine?: boolean;
}

@Component({
  selector: 'app-admin-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TextInputComponent, TextareaInputComponent],
  templateUrl: './admin-upload.html',
  styleUrls: ['./admin-upload.scss'],
})
export class AdminUpload implements OnChanges {
  private supabase = inject(SupabaseService);
  private translationService = inject(TranslationService);
  private router = inject(Router);

  @Input() editingVideo: any | null = null;
  @Output() clearEditing = new EventEmitter<void>();
  @Output() videoSaved = new EventEmitter<any>();

  title = signal('');
  description = signal('');
  difficulty = signal(1);
  mediaFormat = signal('Anime');
  isActive = signal(false);
  videoFile = signal<File | null>(null);
  vttFile = signal<File | null>(null);
  thumbnailFile = signal<File | null>(null);
  fullVideoUrl = signal('');
  hideSubs = signal(true);
  parsedSubtitles = signal<AdminSubtitleLine[]>([]);

  isTranslating = signal(false);
  isPublishing = signal(false);
  isTitleTaken = signal(false);
  statusMessage = signal('');

  isDraggingVideo = signal(false);
  isDraggingVtt = signal(false);
  isDraggingThumbnail = signal(false);
  isRemovingThumbnail = signal(false);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['editingVideo'] && this.editingVideo) {
      this.loadVideoForEdit(this.editingVideo);
    } else if (changes['editingVideo'] && !this.editingVideo) {
      this.resetForm();
    }
  }

  private async loadVideoForEdit(video: any) {
    this.title.set(video.title);
    this.description.set(video.description || '');
    this.difficulty.set(video.difficulty || 1);
    this.mediaFormat.set(video.media_format || 'Anime');
    this.isActive.set(video.is_active || false);
    this.hideSubs.set(video.hide_subs ?? true);
    this.fullVideoUrl.set(video.full_video_url || '');
    this.videoFile.set(null);
    this.vttFile.set(null);
    this.thumbnailFile.set(null);
    this.isRemovingThumbnail.set(false);

    try {
      const subsData = await this.supabase.getSubtitlesByVideoId(video.id);
      this.parsedSubtitles.set(subsData?.subtitles_json || []);
    } catch (err) {
      console.error('Error cargando subtítulos', err);
    }
  }

  onVideoFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.videoFile.set(file);
      this.updateTitleFromFile(file);
    }
  }

  onVttFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.handleVttFile(file);
  }

  onThumbnailFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file && file.type.startsWith('image/')) {
      this.thumbnailFile.set(file);
    }
  }

  handleVttFile(file?: File) {
    if (file) {
      this.vttFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        this.parseVTT(text);
      };
      reader.readAsText(file);
    }
  }

  onVideoDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDraggingVideo.set(true);
  }

  onVideoDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDraggingVideo.set(false);
  }

  onVideoDrop(event: DragEvent) {
    event.preventDefault();
    this.isDraggingVideo.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('video/')) {
      this.videoFile.set(file);
      this.updateTitleFromFile(file);
    }
  }

  onThumbnailDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDraggingThumbnail.set(true);
  }

  onThumbnailDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDraggingThumbnail.set(false);
  }

  onThumbnailDrop(event: DragEvent) {
    event.preventDefault();
    this.isDraggingThumbnail.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      this.thumbnailFile.set(file);
    }
  }

  onVttDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDraggingVtt.set(true);
  }

  onVttDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDraggingVtt.set(false);
  }

  onVttDrop(event: DragEvent) {
    event.preventDefault();
    this.isDraggingVtt.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file && file.name.endsWith('.vtt')) {
      this.handleVttFile(file);
    }
  }

  private updateTitleFromFile(file: File) {
    // Solo auto-completamos si el título está vacío
    if (!this.title() || this.title().trim() === '') {
      const fileName = file.name.split('.').slice(0, -1).join('.');
      const cleanTitle = fileName
        .replace(/[_-]/g, ' ') // Cambiamos guiones por espacios
        .replace(/\b\w/g, (l) => l.toUpperCase()); // Capitalizamos palabras

      this.onTitleChange(cleanTitle);
    }
  }

  private parseVTT(text: string) {
    const lines = text.split('\n');
    const subs: AdminSubtitleLine[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(' --> ')) {
        const [startStr, endStr] = lines[i].split(' --> ');
        const content = lines[i + 1]?.trim();

        if (content) {
          subs.push({
            start: this.timeToSeconds(startStr),
            end: this.timeToSeconds(endStr),
            text: content,
            translation: '',
          });
        }
      }
    }

    this.parsedSubtitles.set(subs);
  }

  private timeToSeconds(timeStr: string): number {
    const parts = timeStr.trim().split('.');
    const timeParts = parts[0].split(':').map(Number);
    const ms = Number(parts[1] || '000') / 1000;

    let hh = 0;
    let mm = 0;
    let ss = 0;

    if (timeParts.length === 3) {
      [hh, mm, ss] = timeParts;
    } else if (timeParts.length === 2) {
      [mm, ss] = timeParts;
    }

    return hh * 3600 + mm * 60 + ss + ms;
  }

  async translateAll() {
    this.isTranslating.set(true);
    const subs = [...this.parsedSubtitles()];

    for (let i = 0; i < subs.length; i++) {
      await this.translateLineInternal(i, subs);
    }

    this.isTranslating.set(false);
    this.statusMessage.set('Traducción completa ✨');
  }

  onJpInput(index: number, event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    const converted = toHiragana(textarea.value, { IMEMode: true });

    this.parsedSubtitles.update((subs) => {
      const newSubs = [...subs];
      newSubs[index] = { ...newSubs[index], text: converted };
      return newSubs;
    });

    textarea.value = converted;
  }

  async translateSingle(index: number) {
    this.statusMessage.set(`Traduciendo línea ${index + 1}...`);
    const subs = [...this.parsedSubtitles()];
    await this.translateLineInternal(index, subs);
    this.statusMessage.set(`Línea ${index + 1} traducida.`);
  }

  addSubtitleLine(index?: number) {
    const currentSubs = [...this.parsedSubtitles()];
    let newStart = 0;
    let newEnd = 2;

    if (index !== undefined) {
      const prevSub = index > 0 ? currentSubs[index - 1] : null;
      const nextSub = currentSubs[index];

      if (prevSub && nextSub) {
        newStart = prevSub.end;
        const gap = nextSub.start - prevSub.end;
        if (gap > 1) {
          newEnd = prevSub.end + 1;
        } else if (gap > 0) {
          newEnd = prevSub.end + (gap / 2);
        } else {
          newEnd = prevSub.end + 0.5;
        }
      } else if (nextSub) {
        newStart = Math.max(0, nextSub.start - 2);
        newEnd = nextSub.start;
      } else if (prevSub) {
        newStart = prevSub.end;
        newEnd = prevSub.end + 2;
      }
      
      currentSubs.splice(index, 0, { start: newStart, end: newEnd, text: '', translation: '' });
    } else {
      const lastEnd = currentSubs.length > 0 ? currentSubs[currentSubs.length - 1].end : 0;
      currentSubs.push({ start: lastEnd, end: lastEnd + 2, text: '', translation: '' });
    }

    this.parsedSubtitles.set(currentSubs);
  }

  removeSubtitleLine(index: number) {
    this.parsedSubtitles.set(this.parsedSubtitles().filter((_, i) => i !== index));
  }

  async onTitleChange(newTitle: string) {
    this.title.set(newTitle);
    if (!newTitle) {
      this.isTitleTaken.set(false);
      return;
    }
    try {
      const taken = await this.supabase.isTitleTaken(newTitle);
      if (this.editingVideo && this.editingVideo.title === newTitle) {
        this.isTitleTaken.set(false);
        return;
      }
      this.isTitleTaken.set(taken);
    } catch (err) {
      console.error('Error checking title', err);
    }
  }

  generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  resetForm() {
    this.editingVideo = null;
    this.title.set('');
    this.description.set('');
    this.difficulty.set(1);
    this.mediaFormat.set('Anime');
    this.isActive.set(false);
    this.hideSubs.set(true);
    this.fullVideoUrl.set('');
    this.videoFile.set(null);
    this.vttFile.set(null);
    this.thumbnailFile.set(null);
    this.isRemovingThumbnail.set(false);
    this.parsedSubtitles.set([]);
    this.statusMessage.set('');
    this.isTitleTaken.set(false);
    this.clearEditing.emit();
  }

  private async translateLineInternal(i: number, subs: AdminSubtitleLine[]) {
    const contextBefore = i > 0 ? subs[i - 1].text : '';
    const contextAfter = i < subs.length - 1 ? subs[i + 1].text : '';
    
    return new Promise<void>((resolve) => {
      subs[i].isTranslatingLine = true;
      subs[i].translation = '';
      this.parsedSubtitles.set([...subs]);

      this.translationService.translateTextStream(subs[i].text, contextBefore, contextAfter)
        .subscribe({
          next: (val) => {
            subs[i].translation = val;
            this.parsedSubtitles.set([...subs]);
          },
          error: (err) => {
            console.error('Error translating line', i, err);
            subs[i].translation = `[Error: ${err.message}]`;
            subs[i].isTranslatingLine = false;
            this.parsedSubtitles.set([...subs]);
            resolve();
          },
          complete: () => {
            subs[i].isTranslatingLine = false;
            this.parsedSubtitles.set([...subs]);
            resolve();
          }
        });
    });
  }

  async publish() {
    if (!this.title() || (this.parsedSubtitles().length === 0 && !this.editingVideo)) {
      alert('Faltan datos obligatorios.');
      return;
    }

    if (!this.editingVideo && !this.videoFile()) {
      alert('Debes subir un video.');
      return;
    }

    this.isPublishing.set(true);

    try {
      let videoUrl = '';
      let thumbnailUrl = '';
      
      if (this.videoFile()) {
        this.statusMessage.set('Subiendo video a Storage...');
        const file = this.videoFile()!;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `videos/${fileName}`;
        await this.supabase.uploadVideoToStorage(filePath, file);
        videoUrl = this.supabase.getPublicMediaUrl(filePath);
      }

      if (this.thumbnailFile()) {
        this.statusMessage.set('Subiendo miniatura a Storage...');
        const file = this.thumbnailFile()!;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `thumbnails/${fileName}`;
        await this.supabase.uploadVideoToStorage(filePath, file);
        thumbnailUrl = this.supabase.getPublicMediaUrl(filePath);
      }

      const videoData: any = {
        title: this.title(),
        slug: this.generateSlug(this.title()),
        description: this.description(),
        difficulty: this.difficulty(),
        media_format: this.mediaFormat(),
        phrase_count: this.parsedSubtitles().length,
        is_active: this.isActive(),
        is_approved: this.isActive(), // Si el admin lo activa, se aprueba automáticamente
        hide_subs: this.hideSubs(),
        full_video_url: this.fullVideoUrl(),
      };
      if (videoUrl) videoData.video_url = videoUrl;
      if (thumbnailUrl) videoData.thumbnail_url = thumbnailUrl;

      if (this.editingVideo && this.editingVideo.id) {
        await this.supabase.updateVideo(this.editingVideo.id, videoData);
        await this.supabase.updateSubtitles(this.editingVideo.id, this.parsedSubtitles());
        this.statusMessage.set('¡Actualizado con éxito! ✨');
        this.videoSaved.emit({ ...this.editingVideo, ...videoData });
      } else {
        const videoRecord = await this.supabase.insertVideo(videoData);
        await this.supabase.insertSubtitles({ video_id: videoRecord.id, subtitles_json: this.parsedSubtitles() });
        this.statusMessage.set('¡Guardado exitosamente! ✨');
        this.videoSaved.emit(videoRecord);
      }

      // No llamamos a resetForm() ni navegamos fuera para que el usuario pueda seguir editando
    } catch (err: any) {
      this.statusMessage.set(`Error: ${err.message}`);
      alert(`Ocurrió un error: ${err.message}`);
    } finally {
      this.isPublishing.set(false);
    }
  }
}
