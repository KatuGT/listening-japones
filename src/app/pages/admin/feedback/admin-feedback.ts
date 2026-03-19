import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-admin-feedback',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin-feedback.html',
  styleUrls: ['./admin-feedback.scss'],
})
export class AdminFeedback {
  private supabase = inject(SupabaseService);

  feedbackList = signal<any[]>([]);

  constructor() {
    this.loadFeedback();
  }

  async loadFeedback() {
    try {
      const feedback = await this.supabase.getAllFeedback();
      this.feedbackList.set(feedback);
    } catch (err) {
      console.error('Error loading feedback', err);
    }
  }

  async resolveFeedback(item: any, responseText: string) {
    if (!responseText.trim()) return;
    try {
      await this.supabase.updateFeedback(item.id, {
        status: 'resuelto',
        admin_response: responseText,
        resolved_at: new Date().toISOString(),
      });
      this.loadFeedback();
    } catch (err) {
      console.error('Error resolving feedback', err);
    }
  }

  async toggleFeedbackVisibility(item: any) {
    try {
      await this.supabase.updateFeedback(item.id, {
        is_visible: !item.is_visible,
      });
      this.loadFeedback();
    } catch (err) {
      console.error('Error toggling visibility', err);
    }
  }
}
