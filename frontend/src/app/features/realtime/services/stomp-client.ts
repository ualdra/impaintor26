import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Client, IMessage } from '@stomp/stompjs';
import { BehaviorSubject, Observable } from 'rxjs';

import { ConnectionStatus, StompConfig } from '../models/stomp';

/**
 * PENDING — Track F (Lobby + WebSocketService) absorberá este servicio.
 *
 * Wrapper mínimo sobre @stomp/stompjs que aporta:
 *  - signals/observables de estado de conexión
 *  - subscribe/send tipados con parsing JSON automático
 *  - SSR-safe: no hace nada si no estamos en browser
 *
 * Cuando F mergee su WebSocketService, GameComponent solo cambia el import.
 */
@Injectable({ providedIn: 'root' })
export class StompClientService {
  private readonly platformId = inject(PLATFORM_ID);

  private client: Client | null = null;
  private readonly _status$ = new BehaviorSubject<ConnectionStatus>('IDLE');

  /** Observable del estado de conexión. */
  readonly status$: Observable<ConnectionStatus> = this._status$.asObservable();

  connect(config: StompConfig): void {
    if (!isPlatformBrowser(this.platformId)) {
      // SSR safety — no se conecta en el render del servidor.
      return;
    }
    if (this.client?.active) {
      return;
    }

    this._status$.next('CONNECTING');

    this.client = new Client({
      brokerURL: this.resolveUrl(config.url),
      connectHeaders: { Authorization: `Bearer ${config.jwt}` },
      reconnectDelay: config.reconnectDelayMs ?? 5_000,
      onConnect: () => this._status$.next('CONNECTED'),
      onStompError: () => this._status$.next('ERROR'),
      onWebSocketClose: () => {
        if (this._status$.value !== 'DISCONNECTED') {
          this._status$.next('ERROR');
        }
      },
    });

    this.client.activate();
  }

  /**
   * Suscribe a un destino STOMP y emite los payloads JSON parseados.
   * El observable solo emite mientras la suscripción esté activa.
   */
  subscribe<T>(destination: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      if (!this.client) {
        subscriber.error(new Error('StompClient not connected'));
        return;
      }
      const sub = this.client.subscribe(destination, (frame: IMessage) => {
        try {
          subscriber.next(JSON.parse(frame.body) as T);
        } catch (e) {
          subscriber.error(e);
        }
      });
      return () => sub?.unsubscribe();
    });
  }

  /** Publica un mensaje al destino /app/... del servidor. */
  send<T>(destination: string, body: T): void {
    if (!this.client?.active) {
      return;
    }
    this.client.publish({
      destination,
      body: JSON.stringify(body),
    });
  }

  disconnect(): void {
    if (!this.client) {
      return;
    }
    this.client.deactivate();
    this.client = null;
    this._status$.next('DISCONNECTED');
  }

  /**
   * Convierte una URL relativa (ej: '/ws') a absoluta usando la location actual.
   * En browser; los tests pasan URLs absolutas de mock.
   */
  private resolveUrl(url: string): string {
    if (url.startsWith('ws://') || url.startsWith('wss://')) {
      return url;
    }
    if (typeof window === 'undefined') {
      return url;
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}${url.startsWith('/') ? url : '/' + url}`;
  }
}
