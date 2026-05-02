import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CanvasComponent } from './features/game/components/canvas/canvas';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CanvasComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
}