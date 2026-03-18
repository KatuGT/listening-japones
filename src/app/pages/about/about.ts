import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-about',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './about.html',
    styleUrl: './about.scss'
})
export class AboutComponent {
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
