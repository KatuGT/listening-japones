import { Component, inject, signal, effect, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';
import { FeedbackService } from '../../services/feedback.service';
import { environment } from '../../../environments/environment';

declare var grecaptcha: any;

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback.html',
  styleUrl: './feedback.scss'
})
export class FeedbackComponent {
  private supabase = inject(SupabaseService);
  auth = inject(AuthService);
  feedbackService = inject(FeedbackService);

  content = signal('');
  isSubmitting = signal(false);
  showSuccess = signal(false);
  captchaToken = signal<string | null>(null);
  widgetId: any = null;

  constructor() {
    // Escuchar cuando el modal se abre para renderizar el captcha
    effect(() => {
      if (this.feedbackService.isOpen()) {
        // Un pequeño delay para asegurar que el DOM cargó (especialmente el id="recaptcha-widget")
        setTimeout(() => this.renderCaptcha(), 100);
      } else {
        this.captchaToken.set(null);
        this.widgetId = null;
      }
    });
  }

  renderCaptcha() {
    if (typeof grecaptcha !== 'undefined' && document.getElementById('recaptcha-widget')) {
      try {
        this.widgetId = grecaptcha.render('recaptcha-widget', {
          'sitekey': environment.recaptchaSiteKey,
          'theme': 'dark',
          'callback': (response: string) => {
            this.captchaToken.set(response);
          },
          'expired-callback': () => {
            this.captchaToken.set(null);
          }
        });
      } catch (e) {
        console.warn('reCAPTCHA already rendered or error:', e);
      }
    }
  }

  async submit() {
    if (!this.content().trim() || !this.captchaToken()) return;

    this.isSubmitting.set(true);
    try {
      await this.supabase.verifyCaptchaAndSubmitFeedback(this.captchaToken()!, {
        video_id: this.feedbackService.videoId(),
        video_title: this.feedbackService.videoTitle(),
        type: this.feedbackService.type(),
        content: this.content()
      });
      
      this.showSuccess.set(true);
      this.content.set('');
      this.captchaToken.set(null);
      
      setTimeout(() => {
        this.showSuccess.set(false);
        this.feedbackService.close();
      }, 3000);
    } catch (err) {
      console.error('Error enviando feedback:', err);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
