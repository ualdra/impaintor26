import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/** Tipos de acción del menú — ISP: contrato mínimo y específico. */
export type GameAction = 'create-private' | 'find-ranked' | 'join-room';

/**
 * GameMenuComponent — Responsabilidad Única (SRP):
 * presenta las opciones de juego y emite la acción elegida.
 *
 * OCP: nuevas acciones se añaden extendiendo GameAction y el template
 * sin modificar la lógica existente.
 *
 * LSP: el componente cumple su contrato de emitir eventos sin efectos secundarios.
 *
 * ISO 25010 — Usabilidad (operabilidad): botones grandes, con iconos y
 * descripciones claras para facilitar la navegación.
 * ISO 25010 — Accesibilidad: atributos ARIA y roles semánticos.
 */
@Component({
  selector: 'app-game-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <nav class="game-menu" aria-label="Menú principal de juego" role="navigation">

      <!-- Botón: Crear Partida Privada -->
      <button
        id="btn-create-private"
        class="menu-btn menu-btn--primary"
        type="button"
        aria-label="Crear una partida privada"
        (click)="onAction('create-private')"
      >
        <span class="menu-btn__icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 2rem; height: 2rem; display: inline-block; vertical-align: middle;">
            <path d="M22 20v-9H2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2Z"></path>
            <path d="M18 11V4H6v7"></path>
            <path d="M12 2v2"></path>
            <path d="M5 22v-4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"></path>
            <path d="M9 11V9h2v2"></path>
            <path d="M13 11V9h2v2"></path>
          </svg>
        </span>
        <span class="menu-btn__content">
          <span class="menu-btn__label">Crear Partida Privada</span>
          <span class="menu-btn__desc">Invita a tus amigos con un código</span>
        </span>
        <span class="menu-btn__arrow" aria-hidden="true">›</span>
      </button>

      <!-- Botón: Unirse a Sala -->
      <button
        id="btn-show-join-popup"
        class="menu-btn menu-btn--join"
        style="margin-top: 1rem;"
        type="button"
        aria-label="Introducir código para unirse a partida"
        (click)="openJoinPopup()"
      >
        <span class="menu-btn__icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 2rem; height: 2rem; display: inline-block; vertical-align: middle;">
            <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
          </svg>
        </span>
        <span class="menu-btn__content">
          <span class="menu-btn__label">Unirse a Partida Privada</span>
          <span class="menu-btn__desc">Usa el código de un amigo</span>
        </span>
        <span class="menu-btn__arrow" aria-hidden="true">›</span>
      </button>

      <!-- Pop-up para introducir código (Modal) -->
      <div class="popup-overlay" *ngIf="showJoinPopup" (click)="closeJoinPopup(true)">
        <div class="popup-content" (click)="$event.stopPropagation()">
          <button class="popup-close" (click)="closeJoinPopup(false)" aria-label="Cerrar modal">&times;</button>
          <h3>Unirse a sala</h3>
          <p>Introduce el código proporcionado por el anfitrión:</p>
          <input
            type="text"
            maxlength="7"
            [(ngModel)]="roomCode"
            placeholder="Código de sala"
            class="room-code-input"
            aria-label="Código de la sala para unirse"
            (keyup.enter)="onJoinAction()"
            autofocus
          />
          <div class="popup-actions">
            <button class="btn-cancel" (click)="closeJoinPopup(false)">Cancelar</button>
            <button
              class="btn-submit"
              (click)="onJoinAction()"
              [disabled]="!roomCode || roomCode.length < 3"
            >
              Entrar
            </button>
          </div>
        </div>
      </div>

      <!-- Separador decorativo -->
      <div class="menu-separator" aria-hidden="true">
        <span>✦</span>
      </div>

      <!-- Botón: Buscar Partida Competitiva (Ranked) -->
      <button
        id="btn-find-ranked"
        class="menu-btn menu-btn--ranked"
        type="button"
        aria-label="Buscar partida competitiva en modo ranked"
        (click)="onAction('find-ranked')"
      >
        <span class="menu-btn__icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 2rem; height: 2rem; display: inline-block; vertical-align: middle;">
            <path d="M14.5 17.5 3 6V3h3l11.5 11.5"></path>
            <path d="M13 19 19 13"></path>
            <path d="M16 20 20 16"></path>
            <path d="M9.5 17.5 21 6V3h-3L6.5 14.5"></path>
            <path d="M11 19 5 13"></path>
            <path d="M8 20 4 16"></path>
          </svg>
        </span>
        <span class="menu-btn__content">
          <span class="menu-btn__label">Buscar Partida Competitiva</span>
          <span class="menu-btn__desc">Enfrenta a rivales de tu nivel</span>
        </span>
        <span class="menu-btn__arrow" aria-hidden="true">›</span>
      </button>

    </nav>
  `,
  styleUrl: './game-menu.component.css',
})
export class GameMenuComponent {
  /**
   * Evento emitido con la acción seleccionada. Puede emitir un string que contenga
   * informacion extra como el codigo de la sala. Ej 'join-room:ABCDEF'
   */
  readonly actionSelected = output<string>();

  roomCode: string = '';
  showJoinPopup: boolean = false;

  /** Emite la acción elegida. */
  onAction(action: string): void {
    this.actionSelected.emit(action);
  }

  openJoinPopup() {
    this.roomCode = '';
    this.showJoinPopup = true;
  }

  closeJoinPopup(clickOverlay: boolean) {
    // Si se pasa clickOverlay = true, cerramos. Es opcional controlarlo.
    this.showJoinPopup = false;
  }

  onJoinAction(): void {
    if (this.roomCode && this.roomCode.length >= 3) {
      this.actionSelected.emit(`join-room:${this.roomCode.trim().toUpperCase()}`);
      this.showJoinPopup = false;
    }
  }
}
