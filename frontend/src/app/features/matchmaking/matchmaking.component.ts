import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { MatchmakingService } from '../../core/services/matchmaking.service';

interface MatchFoundMessage {
  type: string;
  roomCode: string;
}

@Component({
  selector: 'app-matchmaking',
  standalone: true,
  imports: [],
  templateUrl: './matchmaking.component.html',
  styleUrl: './matchmaking.component.css',
})
export class MatchmakingComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private wsService = inject(WebSocketService);
  private matchmakingService = inject(MatchmakingService);

  waitSeconds = signal(0);
  searchRange = signal(50);
  myElo = signal(0);
  error = signal<string | null>(null);

  private matchFound = false;
  private subs = new Subscription();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private localJoinedAt: number | null = null;

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) this.myElo.set(user.elo);

    const token = this.authService.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.wsService.connect({ url: '/ws', jwt: token });

    const wsSub = this.wsService
      .subscribe<MatchFoundMessage>('/user/queue/private')
      .subscribe((msg) => {
        if (msg.type === 'MATCH_FOUND') {
          this.matchFound = true;
          this.stopTick();
          this.stopPolling();
          this.router.navigate(['/room', msg.roomCode, 'lobby']);
        }
      });
    this.subs.add(wsSub);

    const connSub = this.wsService.status$.pipe(
      filter((s) => s === 'CONNECTED'),
      take(1),
    ).subscribe(() => {
      this.joinAndStart();
      this.startPolling();
    });
    this.subs.add(connSub);
  }

  private joinAndStart(): void {
    this.stopTick();
    this.matchmakingService.joinQueue().subscribe({
      next: (status) => {
        this.error.set(null);
        this.searchRange.set(status.searchRange);
        this.localJoinedAt = Date.now() - status.waitSeconds * 1000;
        this.startTick();
      },
      error: () => this.error.set('No se pudo unir a la cola. Inténtalo de nuevo.'),
    });
  }

  private startTick(): void {
    this.tickInterval = setInterval(() => {
      if (this.localJoinedAt !== null) {
        this.waitSeconds.set(Math.floor((Date.now() - this.localJoinedAt) / 1000));
      }
    }, 1000);
  }

  private stopTick(): void {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private startPolling(): void {
    this.pollInterval = setInterval(() => {
      const pollSub = this.matchmakingService.getStatus().subscribe({
        next: (status) => {
          if (!status.queued && !this.matchFound) {
            // Kicked from queue (e.g. WebSocket reconnect or failed room creation); silently re-join.
            this.joinAndStart();
            return;
          }
          this.searchRange.set(status.searchRange);
        },
      });
      this.subs.add(pollSub);
    }, 3000);
  }

  private stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  cancel(): void {
    this.matchFound = true;
    this.stopTick();
    this.stopPolling();
    this.matchmakingService.leaveQueue().subscribe();
    this.router.navigate(['/main_menu']);
  }

  lowerElo(): number {
    return Math.max(0, this.myElo() - this.searchRange());
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    this.stopTick();
    this.stopPolling();
    this.subs.unsubscribe();
    if (!this.matchFound) {
      this.matchmakingService.leaveQueue().subscribe();
    }
  }
}
