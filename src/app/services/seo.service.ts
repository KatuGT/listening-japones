import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);

  /**
   * Actualiza el título de la página
   */
  updateTitle(newTitle: string) {
    this.title.setTitle(newTitle);
  }

  /**
   * Actualiza los meta tags principales
   */
  updateTags(config: { title?: string; description?: string; image?: string; url?: string; type?: string }) {
    if (config.title) {
      this.title.setTitle(config.title);
      this.meta.updateTag({ name: 'description', content: config.description || '' });
      
      // Global
      this.meta.updateTag({ property: 'og:site_name', content: 'Listening Japonés' });
      this.meta.updateTag({ property: 'og:type', content: config.type || 'website' });

      // Twitter
      this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
      this.meta.updateTag({ name: 'twitter:title', content: config.title });
      this.meta.updateTag({ name: 'twitter:description', content: config.description || '' });
      
      // Open Graph (Facebook/WhatsApp)
      this.meta.updateTag({ property: 'og:title', content: config.title });
      this.meta.updateTag({ property: 'og:description', content: config.description || '' });
    }

    if (config.image) {
      // Usamos la URL absoluta si es posible, o la relativa para el entorno
      const imageUrl = config.image.startsWith('http') ? config.image : window.location.origin + config.image;
      this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
      this.meta.updateTag({ property: 'og:image', content: imageUrl });
    }
    
    if (config.url) {
      const fullUrl = config.url.startsWith('http') ? config.url : window.location.origin + config.url;
      this.meta.updateTag({ property: 'og:url', content: fullUrl });
    }
  }
}
