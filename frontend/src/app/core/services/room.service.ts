import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RoomConfig {
  drawingTime: number;
  impostorLives: number;
}

export interface CreateRoomResponse {
  roomCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  private http = inject(HttpClient);
  // Using direct path assuming there is an API proxy setup (e.g. proxy.conf.json or nginx)
  private apiUrl = '/api/rooms';

  createRoom(config: RoomConfig): Observable<CreateRoomResponse> {
    return this.http.post<CreateRoomResponse>(this.apiUrl, config);
  }

  joinRoom(roomCode: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${roomCode}/join`, {});
  }
}
