import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

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
          this.stopPolling();
          this.router.navigate(['/room', msg.roomCode, 'lobby']);
        }
      });
    this.subs.add(wsSub);

    this.matchmakingService.joinQueue().subscribe({
      next: (status) => {
        this.waitSeconds.set(status.waitSeconds);
        this.searchRange.set(status.searchRange);
        this.startPolling();
      },
      error: () => this.error.set('No se pudo unir a la cola. Inténtalo de nuevo.'),
    });
  }

  private startPolling(): void {
    this.pollInterval = setInterval(() => {
      const pollSub = this.matchmakingService.getStatus().subscribe({
        next: (status) => {
          this.waitSeconds.set(status.waitSeconds);
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
    this.stopPolling();
    this.matchmakingService.leaveQueue().subscribe();
    this.router.navigate(['/main_menu']);
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.subs.unsubscribe();
    if (!this.matchFound) {
      this.matchmakingService.leaveQueue().subscribe();
    }
  }
}
