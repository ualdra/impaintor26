import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CanvasComponent } from '../../game/components/canvas/canvas';

/**
 * Modelo de un jugador en la partida (simulado en frontend).
 * CLAUDE.md §8.2 — GameComponent sub-vistas.
 */
interface Player {
  id: number;
  username: string;
  isCurrentUser: boolean;
  isDrawingNow: boolean;
}

/**
 * GameComponent — Vista principal de la partida (fase de dibujo).
 *
 * SRP: gestiona el estado de la UI de la fase de dibujo y delega el canvas
 * a un componente hijo (a implementar por el compañero del Track G).
 *
 * CLAUDE.md §8.2 / §2I:
 * - Pintores: ven la palabra secreta, el lienzo, el temporizador y la lista de jugadores.
 * - Impostor: ve la pista, la caja de adivinación flotante, el temporizador y la lista.
 *
 * ISO 25010 — Usabilidad: retroalimentación visual del rol y del temporizador.
 */
@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, FormsModule, CanvasComponent],
  templateUrl: './game.html',
  styleUrl: './game.css',
})
export class Game implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);

  // ── Parámetros de ruta ──────────────────────────────────────────────────────
  roomCode = this.route.snapshot.paramMap.get('code') || 'UNKNOWN';

  // ── Estado del juego (simulado — en producción llega vía STOMP) ─────────────
  /**
   * Cambia entre 'painter' y 'impostor' para simular ambos roles.
   * En producción, llega en el mensaje privado ROLE_ASSIGNMENT (CLAUDE.md §6.2).
   */
  readonly role = signal<'painter' | 'impostor'>('painter');

  /** Palabra secreta que ven los pintores (CLAUDE.md §2.2). */
  readonly secretWord = signal<string>('GUITARRA');

  /** Pista que recibe el impostor — 1 de las 2 palabras restantes del grupo (CLAUDE.md §2.4). */
  readonly hint = signal<string>('PIANO');

  /** Vidas restantes del impostor para adivinar (por defecto 1, CLAUDE.md §2.4). */
  readonly impostorLives = signal<number>(1);

  /** Texto del intento de adivinación del impostor. */
  guessInput = '';

  /** Segundos restantes del turno actual. */
  readonly timeLeft = signal<number>(30);

  /** Número de ronda actual (CLAUDE.md §2.2). */
  readonly round = signal<number>(1);

  /** Lista de jugadores de la sala (simulada). */
  readonly players = signal<Player[]>([
    { id: 1, username: 'Tú', isCurrentUser: true, isDrawingNow: true },
    { id: 2, username: 'Jugador2', isCurrentUser: false, isDrawingNow: false },
    { id: 3, username: 'Jugador3', isCurrentUser: false, isDrawingNow: false },
    { id: 4, username: 'Jugador4', isCurrentUser: false, isDrawingNow: false },
    { id: 5, username: 'Jugador5', isCurrentUser: false, isDrawingNow: false },
  ]);

  /** ¿Es el turno del usuario actual para dibujar? */
  readonly isMyTurn = computed(() =>
    this.players().find(p => p.isCurrentUser)?.isDrawingNow ?? false
  );

  /** ¿Es el usuario el impostor? */
  readonly isImpostor = computed(() => this.role() === 'impostor');

  // ── Timer ───────────────────────────────────────────────────────────────────
  private timerInterval?: ReturnType<typeof setInterval>;

  // ── Ciclo de vida ───────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  // ── Métodos públicos ─────────────────────────────────────────────────────────
  /** Formatea los segundos en mm:ss para el template. */
  formatTime(secs: number): string {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  /**
   * Alterna el rol entre pintor e impostor para facilitar la demo.
   * En producción este botón no existe — el rol viene del servidor.
   */
  toggleRole(): void {
    this.role.update(r => r === 'painter' ? 'impostor' : 'painter');
    this.timeLeft.set(30);
    this.clearTimer();
    this.startTimer();
  }

  /** El impostor envía un intento de adivinación (CLAUDE.md §2.4). */
  onSubmitGuess(): void {
    if (!this.guessInput.trim()) return;
    // En producción: enviar a /app/room.{code}.guess vía STOMP (CLAUDE.md §6.2)
    const correct = this.guessInput.trim().toUpperCase() === this.secretWord();
    if (correct) {
      alert('✅ ¡Correcto! El impostor gana. (Simulado)');
    } else {
      const livesLeft = this.impostorLives() - 1;
      this.impostorLives.set(livesLeft);
      if (livesLeft <= 0) {
        alert('❌ Incorrecto y sin vidas. Los pintores ganan. (Simulado)');
      } else {
        alert(`❌ Incorrecto. Te quedan ${livesLeft} vidas.`);
      }
    }
    this.guessInput = '';
  }

  // ── Privados ─────────────────────────────────────────────────────────────────
  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      const current = this.timeLeft();
      if (current > 0) {
        this.timeLeft.set(current - 1);
      } else {
        this.clearTimer();
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }
}
