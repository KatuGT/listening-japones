import { Component } from '@angular/core';

@Component({
  selector: 'app-guess-input-skeleton',
  standalone: true,
  templateUrl: './guess-input-skeleton.html',
  styleUrl: './guess-input-skeleton.scss'
})
export class GuessInputSkeletonComponent {
  // Array de 4 elementos para mostrar 4 tarjetas skeleton por defecto
  dummyItems = [1, 2, 3, 4];
}
