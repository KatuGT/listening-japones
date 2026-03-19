import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppButtonComponent } from '../../components/app-button/app-button';
import { SeoService } from '../../services/seo.service';

@Component({
    selector: 'app-about',
    standalone: true,
    imports: [CommonModule, RouterModule, AppButtonComponent],
    templateUrl: './about.html',
    styleUrl: './about.scss'
})
export class AboutComponent implements OnInit {
    private seoService = inject(SeoService);

    ngOnInit() {
        this.seoService.updateTags({
            title: 'Sobre el Proyecto',
            description: 'Conoce más sobre Listening Japonés, nuestra misión y cómo nació esta herramienta para estudiantes de japonés.',
            image: '/assets/images/open-graph-whatsapp.webp',
            url: '/sobre-el-proyecto'
        });
    }

    public technologies = [
        { name: 'Angular 18', icon: '🅰️', desc: 'Framework moderno con Signals y Control Flow nativo.' },
        { name: 'Supabase', icon: '⚡', desc: 'Base de datos en tiempo real, Auth y Storage.' },
        { name: 'SCSS (Glassmorphism)', icon: '🎨', desc: 'Diseño ultra-premium con desenfoques y gradientes.' },
        { name: 'TypeScript', icon: '🟦', desc: 'Tipado fuerte para una arquitectura escalable.' }
    ];

    public features = [
        { title: 'Inmersión Real', desc: 'Aprende con audio original de anime y series, sin filtros.' },
        { title: 'Validación Inteligente', desc: 'Sistema de evaluación que reconoce Kanji, Hiragana y Katakana.' },
        { title: 'Diccionario Integrado', desc: 'Busca significados al instante tocando cualquier palabra.' }
    ];
}
