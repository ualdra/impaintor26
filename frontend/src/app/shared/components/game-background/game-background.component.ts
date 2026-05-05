import { Component } from '@angular/core';

/**
 * GameBackgroundComponent
 * 
 * SRP: Responsable únicamente de renderizar el fondo temático y las partículas
 * decorativas compartidas en toda la aplicación.
 * 
 * ISO 25010 — Mantenibilidad: Facilita cambios globales en la estética del fondo.
 */
@Component({
  selector: 'app-game-background',
  standalone: true,
  templateUrl: './game-background.component.html',
  styleUrl: './game-background.component.css'
})
export class GameBackgroundComponent {}
