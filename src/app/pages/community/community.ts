import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { TextInputComponent } from '../../components/text-input/text-input';
import { TextareaInputComponent } from '../../components/textarea-input/textarea-input';
import { AppButtonComponent } from '../../components/app-button/app-button';
import { environment } from '../../../environments/environment';

declare var grecaptcha: any;

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, FormsModule, TextInputComponent, TextareaInputComponent, AppButtonComponent],
  templateUrl: './community.html',
  styleUrl: './community.scss'
})
export class CommunityComponent implements OnInit {
  private supabaseService = inject(SupabaseService);

  public feedbackList = signal<any[]>([]);
  public clipRequestsList = signal<any[]>([]);
  public isLoading = signal(true);

  // Formulario de solicitud de clip
  public clipRequest = {
    title: '',
    source_url: '',
    description: ''
  };
  public isSubmitting = signal(false);
  public successMessage = signal('');
  public errorMessage = signal('');
  public captchaToken = signal<string | null>(null);

  async ngOnInit() {
    await Promise.all([
      this.loadCommunityFeedback(),
      this.loadCommunityClipRequests()
    ]);
    this.renderCaptcha();
  }

  renderCaptcha() {
    if (typeof grecaptcha !== 'undefined' && document.getElementById('recaptcha-community')) {
      try {
        grecaptcha.render('recaptcha-community', {
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
    } else {
      // Si grecaptcha no está listo, reintentar en un momento
      setTimeout(() => this.renderCaptcha(), 500);
    }
  }

  async loadCommunityFeedback() {
    try {
      this.isLoading.set(true);
      const data = await this.supabaseService.getPublicFeedback();
      this.feedbackList.set(data);
    } catch (error) {
      console.error('Error loading community feedback:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadCommunityClipRequests() {
    try {
      this.isLoading.set(true);
      const data = await this.supabaseService.getPublicClipRequests();
      this.clipRequestsList.set(data);
    } catch (error) {
      console.error('Error loading clip requests:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSubmitClipRequest() {
    if (!this.clipRequest.title || !this.captchaToken()) return;

    try {
      this.isSubmitting.set(true);
      this.successMessage.set('');
      this.errorMessage.set('');

      await this.supabaseService.verifyCaptchaAndSubmitClipRequest(this.captchaToken()!, this.clipRequest);
      
      this.successMessage.set('¡Tu solicitud ha sido enviada con éxito! La revisaremos pronto.');
      this.clipRequest = { title: '', source_url: '', description: '' };
      this.captchaToken.set(null);
      
      // Resetear el captcha visualmente
      if (typeof grecaptcha !== 'undefined') grecaptcha.reset();

    } catch (error: any) {
      console.error('Error submitting clip request:', error);
      this.errorMessage.set('Hubo un error al enviar tu solicitud. Inténtalo de nuevo.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
