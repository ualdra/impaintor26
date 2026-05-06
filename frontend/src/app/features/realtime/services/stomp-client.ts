import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { BehaviorSubject, Observable } from 'rxjs';

import { ConnectionStatus, StompConfig } from '../models/stomp';

/**
 * PENDING — Track F (Lobby + WebSocketService) absorberá este servicio.
 *
 * Wrapper mínimo sobre @stomp/stompjs que aporta:
 *  - signals/observables de estado de conexión
 *  - subscribe/send tipados con parsing JSON automático
 *  - cola de suscripciones cuando se llaman antes de CONNECT
 *  - SSR-safe: no hace nada si no estamos en browser
 *
 * Cuando F mergee su WebSocketService, GameComponent solo cambia el import.
 */
@Injectable({ providedIn: 'root' })
export class StompClientService {
  private readonly platformId = inject(PLATFORM_ID);

  private client: Client | null = null;
  private readonly _status$ = new BehaviorSubject<ConnectionStatus>('IDLE');

  /**
   * Suscripciones que se solicitaron antes de que el cliente estuviera CONNECTED.
   * Se aplican en orden cuando llega `onConnect`.
   */
  private readonly pendingSubs: Array<{
    destination: string;
    handler: (frame: IMessage) => void;
    cancelled: boolean;
    bound?: StompSubscription;
  }> = [];

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
      onConnect: () => {
        this._status$.next('CONNECTED');
        this.flushPendingSubs();
      },
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
   * Si todavía no estamos CONNECTED, la suscripción se encola y se aplica al
   * recibir `onConnect`. Cancelar el observable antes del CONNECT cancela la
   * suscripción pendiente.
   */
  subscribe<T>(destination: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const handler = (frame: IMessage) => {
        try {
          subscriber.next(JSON.parse(frame.body) as T);
        } catch (e) {
          subscriber.error(e);
        }
      };

      // Si la conexión STOMP ya está establecida, suscribirse directamente.
      // Se usa el status real (CONNECTED) en vez de client.active, porque
      // active=true desde antes del handshake (ej: mientras reconecta).
      if (this.client && this._status$.value === 'CONNECTED') {
        try {
          const sub = this.client.subscribe(destination, handler);
          return () => sub?.unsubscribe();
        } catch (e) {
          subscriber.error(e);
          return;
        }
      }

      // En otro caso, encolar la suscripción y aplicarla al CONNECT.
      const pending: (typeof this.pendingSubs)[number] = {
        destination,
        handler,
        cancelled: false,
      };
      this.pendingSubs.push(pending);
      return () => {
        pending.cancelled = true;
        pending.bound?.unsubscribe();
      };
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
    this.pendingSubs.length = 0;
    this._status$.next('DISCONNECTED');
  }

  private flushPendingSubs(): void {
    if (!this.client?.active) return;
    while (this.pendingSubs.length > 0) {
      const pending = this.pendingSubs.shift()!;
      if (pending.cancelled) continue;
      try {
        pending.bound = this.client.subscribe(pending.destination, pending.handler);
      } catch {
        // Si subscribe falla, la marcamos cancelada para no reintentar.
        pending.cancelled = true;
      }
    }
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
