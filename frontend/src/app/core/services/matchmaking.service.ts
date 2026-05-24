import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MatchmakingStatus {
  queued: boolean;
  waitSeconds: number;
  searchRange: number;
}

@Injectable({ providedIn: 'root' })
export class MatchmakingService {
  private http = inject(HttpClient);

  joinQueue(): Observable<MatchmakingStatus> {
    return this.http.post<MatchmakingStatus>('/api/matchmaking/queue', {});
  }

  leaveQueue(): Observable<void> {
    return this.http.delete<void>('/api/matchmaking/queue');
  }

  getStatus(): Observable<MatchmakingStatus> {
    return this.http.get<MatchmakingStatus>('/api/matchmaking/status');
  }
}
