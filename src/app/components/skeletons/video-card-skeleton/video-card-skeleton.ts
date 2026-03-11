import { Component } from '@angular/core';

@Component({
  selector: 'app-video-card-skeleton',
  standalone: true,
  templateUrl: './video-card-skeleton.html',
  styleUrl: './video-card-skeleton.scss'
})
export class VideoCardSkeletonComponent {
  // Simularemos 10 videos cargando como pidió el usuario
  dummyItems = Array.from({ length: 10 }, (_, i) => i);
}
