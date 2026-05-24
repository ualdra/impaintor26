import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { GameBackgroundComponent } from '../../../shared/components/game-background/game-background.component';
import { RoomConfig } from '../../../core/services/room.service';

export interface Player {
  username: string;
  isHost: boolean;
  avatarUrl?: string;
}

interface RoomDetails {
  roomCode: string;
  mode: 'RANKED' | 'CUSTOM' | 'SWIFTPLAY';
  size: number | null;
  gameState: 'WAITING' | 'PLAYING' | 'FINISHED';
  impostorTries: number | null;
  drawTime: number | null;
  playersNames: { id: number; username: string }[];
}

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, RouterLink, GameBackgroundComponent],
  templateUrl: './lobby.html',
  styleUrl: './lobby.css',
})
export class Lobby implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly wsService = inject(WebSocketService);
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);

  roomCode = this.route.snapshot.paramMap.get('code') || 'UNKNOWN';
  Math = Math;

  players = signal<Player[]>([]);
  roomConfig = signal<RoomConfig | null>(null);
  isHost = signal<boolean>(false);
  isRanked = signal<boolean>(false);
  roomSize = signal<number>(8);
  countdown = signal<number | null>(null);

  private wsSubscription?: Subscription;
  private gameStartSub?: Subscription;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private myUserId: number | null = null;

  ngOnInit() {
    const token = this.authService.getToken();
    if (!token) return;

    const user = this.authService.getCurrentUser();
    if (user) this.myUserId = user.id;

    this.wsService.connect({ url: '/ws', jwt: token });

    // Fetch room details immediately via HTTP for initial player list and mode
    this.http.get<RoomDetails>(`/api/rooms/${this.roomCode}`).subscribe({
      next: (room) => {
        if (room.size) this.roomSize.set(room.size);

        // Map backend User objects to lobby Player interface
        this.players.set(
          room.playersNames.map(u => ({ username: u.username, isHost: false }))
        );

        if (room.mode === 'RANKED') {
          this.isRanked.set(true);
          this.startRankedCountdown(room);
        }

        if (room.gameState === 'PLAYING') {
          this.navigateToGame();
        }
      },
    });

    // WS subscription for lobby updates (custom rooms) — unchanged behavior
    this.wsSubscription = this.wsService
      .subscribe<{ players?: Player[]; config?: RoomConfig }>(`/topic/room.${this.roomCode}.lobby`)
      .subscribe({
        next: (data) => {
          if (data.players) this.players.set(data.players);
          if (data.config) this.roomConfig.set(data.config);

          const currentUsername = localStorage.getItem('username') || '';
          const hostPlayer = this.players().find(p => p.isHost);
          if (hostPlayer && hostPlayer.username === currentUsername) {
            this.isHost.set(true);
          }
        },
      });

    // WS subscription for GAME_START events
    this.gameStartSub = this.wsService
      .subscribe<{ type: string }>(`/topic/room.${this.roomCode}.game`)
      .subscribe({
        next: (data) => {
          if (data.type === 'GAME_START') {
            this.navigateToGame();
          }
        },
      });

    // HTTP polling fallback for game start (covers WS failures)
    this.pollInterval = setInterval(() => {
      this.http.get<RoomDetails>(`/api/rooms/${this.roomCode}`).subscribe({
        next: (room) => {
          if (room.gameState === 'PLAYING') {
            this.navigateToGame();
          }
        },
      });
    }, 3000);
  }

  // For ranked matches: countdown then auto-start. Only the player with the
  // lowest userId actually calls /start (others rely on WS or polling fallback).
  private startRankedCountdown(room: RoomDetails): void {
    const sortedIds = room.playersNames.map(p => p.id).sort((a, b) => a - b);
    const isCaller = this.myUserId === sortedIds[0];

    let secs = 5;
    this.countdown.set(secs);
    this.countdownInterval = setInterval(() => {
      secs--;
      this.countdown.set(secs);
      if (secs <= 0) {
        clearInterval(this.countdownInterval!);
        this.countdownInterval = null;
        this.countdown.set(null);
        if (isCaller) {
          this.http.post(`/api/rooms/${this.roomCode}/start`, {}).subscribe({
            error: () => { /* another player already started it */ },
          });
        }
      }
    }, 1000);
  }

  private navigateToGame(): void {
    this.stopIntervals();
    this.router.navigate(['/room', this.roomCode, 'game']);
  }

  // Custom room: host starts manually
  startGame() {
    if (this.isHost()) {
      this.wsService.send(`/app/room.${this.roomCode}.start`, {});
    }
  }

  copyCode() {
    navigator.clipboard.writeText(this.roomCode);
    alert('¡Código copiado al portapapeles!');
  }

  private stopIntervals(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  ngOnDestroy() {
    this.stopIntervals();
    if (this.wsSubscription) this.wsSubscription.unsubscribe();
    if (this.gameStartSub) this.gameStartSub.unsubscribe();
  }
}
