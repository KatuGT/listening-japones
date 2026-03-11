import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { toHiragana } from 'wanakana';

export interface AdminSubtitleLine {
  start: number;
  end: number;
  text: string;
  translation: string;
}

@Component({
  selector: 'app-admin',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private translationService = inject(TranslationService);
  private router = inject(Router);

  title = signal('');
  description = signal('');
  difficulty = signal(1);
  isActive = signal(false);
  videoFile = signal<File | null>(null);
  vttFile = signal<File | null>(null);

  parsedSubtitles = signal<AdminSubtitleLine[]>([]);

  activeTab = signal<'upload' | 'manage'>('upload');
  videoList = signal<any[]>([]);
  editingVideoId = signal<string | null>(null);

  isTranslating = signal(false);
  isPublishing = signal(false);
  statusMessage = signal('');

  isDraggingVideo = signal(false);
  isDraggingVtt = signal(false);

  ngOnInit() {
    this.loadVideos();
  }

  async loadVideos() {
    try {
      const videos = await this.supabase.getVideos();
      this.videoList.set(videos);
    } catch (err) {
      console.error('Error loading videos', err);
    }
  }

  setTab(tab: 'upload' | 'manage') {
    this.activeTab.set(tab);
    if (tab === 'manage') {
      this.loadVideos();
    }
  }

  onVideoFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.videoFile.set(file);
  }

  onVttFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.handleVttFile(file);
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

  // Drag & Drop Video
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
    }
  }

  // Drag & Drop VTT
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
            translation: ''
          });
        }
      }
    }
    this.parsedSubtitles.set(subs);
  }

  private timeToSeconds(timeStr: string): number {
    const parts = timeStr.trim().split('.');
    const hhmmss = parts[0];
    const ms = parts[1] || '000';
    const [hh, mm, ss] = hhmmss.split(':').map(Number);
    return (hh * 3600) + (mm * 60) + ss + (Number(ms) / 1000);
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

    this.parsedSubtitles.update(subs => {
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

  addSubtitleLine() {
    const currentSubs = this.parsedSubtitles();
    const lastEnd = currentSubs.length > 0 ? currentSubs[currentSubs.length - 1].end : 0;
    
    this.parsedSubtitles.set([
      ...currentSubs,
      {
        start: lastEnd,
        end: lastEnd + 2,
        text: '',
        translation: ''
      }
    ]);
  }

  removeSubtitleLine(index: number) {
    const currentSubs = this.parsedSubtitles();
    this.parsedSubtitles.set(currentSubs.filter((_, i) => i !== index));
  }

  async deleteVideo(id: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar este video?')) return;

    try {
      this.statusMessage.set('Eliminando subtítulos...');
      await this.supabase.deleteSubtitles(id);
      
      this.statusMessage.set('Eliminando video...');
      await this.supabase.deleteVideo(id);
      
      this.statusMessage.set('¡Video eliminado!');
      this.loadVideos(); // Refresh list
    } catch (err: any) {
      alert(`Error eliminando: ${err.message}`);
    }
  }

  async editVideo(video: any) {
    this.editingVideoId.set(video.id);
    this.title.set(video.title);
    this.description.set(video.description || '');
    this.difficulty.set(video.difficulty || 1);
    this.isActive.set(video.is_active || false);
    
    // El videoFile no se puede cargar de una URL fácilmente a un Input File,
    // así que lo dejamos vacío (el usuario puede resubir si quiere cambiarlo)
    this.videoFile.set(null); 
    
    try {
      this.statusMessage.set('Cargando subtítulos...');
      const subsData = await this.supabase.getSubtitlesByVideoId(video.id);
      if (subsData) {
        this.parsedSubtitles.set(subsData.subtitles_json);
      }
      this.setTab('upload');
    } catch (err: any) {
      alert(`Error cargando subtítulos: ${err.message}`);
    }
  }

  resetForm() {
    this.editingVideoId.set(null);
    this.title.set('');
    this.description.set('');
    this.difficulty.set(1);
    this.isActive.set(false);
    this.videoFile.set(null);
    this.vttFile.set(null);
    this.parsedSubtitles.set([]);
    this.statusMessage.set('');
  }

  private async translateLineInternal(i: number, subs: AdminSubtitleLine[]) {
    const contextBefore = i > 0 ? subs[i - 1].text : '';
    const contextAfter = i < subs.length - 1 ? subs[i + 1].text : '';

    try {
      const translation = await this.translationService.translateText(subs[i].text, contextBefore, contextAfter);
      subs[i].translation = translation;
      this.parsedSubtitles.set([...subs]);
    } catch (err: any) {
      console.error('Error translating line', i, err);
      subs[i].translation = `[Error: ${err.message}]`;
      this.parsedSubtitles.set([...subs]);
    }
  }

  async logout() {
    await this.auth.logout();
  }

  async publish() {
    if (!this.title() || (this.parsedSubtitles().length === 0 && !this.editingVideoId())) {
      alert("Faltan datos obligatorios.");
      return;
    }

    if (!this.editingVideoId() && !this.videoFile()) {
        alert("Debes subir un video.");
        return;
    }

    this.isPublishing.set(true);

    try {
      let videoUrl = '';
      
      // Solo subimos video si hay uno nuevo
      if (this.videoFile()) {
        this.statusMessage.set('Subiendo video a Storage...');
        const file = this.videoFile()!;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `videos/${fileName}`;

        await this.supabase.uploadVideoToStorage(filePath, file);
        videoUrl = this.supabase.getPublicMediaUrl(filePath);
      }

      const videoData: any = {
        title: this.title(),
        description: this.description(),
        difficulty: this.difficulty(),
        is_active: this.isActive(),
      };
      if (videoUrl) videoData.video_url = videoUrl;

      let videoId = this.editingVideoId();

      if (videoId) {
        this.statusMessage.set('Actualizando metadatos del video...');
        await this.supabase.updateVideo(videoId, videoData);
        
        this.statusMessage.set('Actualizando subtítulos...');
        await this.supabase.updateSubtitles(videoId, this.parsedSubtitles());
      } else {
        this.statusMessage.set('Guardando metadatos del video...');
        const videoRecord = await this.supabase.insertVideo(videoData);
        videoId = videoRecord.id;

        this.statusMessage.set('Guardando subtítulos...');
        await this.supabase.insertSubtitles({
          video_id: videoId,
          subtitles_json: this.parsedSubtitles()
        });
      }

      this.statusMessage.set('¡Guardado exitosamente!');
      alert('¡Datos guardados con éxito!');
      
      if (this.editingVideoId()) {
          this.setTab('manage');
      } else {
          this.router.navigate(['/']);
      }

    } catch (err: any) {
      console.error(err);
      this.statusMessage.set(`Error: ${err.message}`);
      alert(`Ocurrió un error: ${err.message}`);
    } finally {
      this.isPublishing.set(false);
    }
  }
}
