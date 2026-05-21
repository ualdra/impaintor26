import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Client, IFrame, Message, StompSubscription } from '@stomp/stompjs';
import { BehaviorSubject, Observable } from 'rxjs';

export type StompStatus = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';

export interface WebSocketConnectConfig {
  /** Endpoint STOMP. Relativo (`/ws`) en producción tras proxy, ws:// absoluto en dev si hace falta. */
  url: string;
  /** JWT raw para auth en el frame CONNECT. */
  jwt: string;
}

interface PendingSubscription {
  topic: string;
  observer: { next: (value: unknown) => void; error: (err: unknown) => void };
  cancelled: boolean;
  apply: () => StompSubscription;
}

/**
 * Cliente STOMP/WebSocket tipado, SSR-safe.
 *
 * Diseño:
 *  - El `Client` no se crea en el constructor (compatibilidad SSR — `window` no existe en server).
 *    Se crea perezosamente en `connect()` y solo si `isPlatformBrowser`.
 *  - `subscribe<T>()` parsea el `Message.body` como JSON y emite el payload tipado.
 *  - Llamadas a `subscribe()` antes de que el cliente esté `CONNECTED` se encolan en
 *    `pendingSubs[]` y se aplican en `onConnect`. Necesario porque `@stomp/stompjs`
 *    puede perder/lanzar suscripciones aplicadas antes del handshake STOMP completo.
 *  - El JWT se recibe como parámetro de `connect()`. El servicio no toca localStorage —
 *    es responsabilidad de `AuthService`.
 *
 * Histórico: consolida el stub temporal `StompClientService` (Track I) y la versión
 * inicial de `WebSocketService` (Track F). Mantiene la API y los tests del stub.
 */
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private readonly platformId = inject(PLATFORM_ID);

  private client: Client | null = null;
  private readonly _status$ = new BehaviorSubject<StompStatus>('IDLE');
  private pendingSubs: PendingSubscription[] = [];

  /** Estado de la conexión observable. */
  readonly status$: Observable<StompStatus> = this._status$.asObservable();

  /**
   * Inicia la conexión STOMP. Idempotente: llamar dos veces no crea dos clientes.
   * No-op en SSR.
   */
  connect(config: WebSocketConnectConfig): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.client?.active) return;

    this._status$.next('CONNECTING');

    this.client = new Client({
      brokerURL: config.url,
      connectHeaders: { Authorization: `Bearer ${config.jwt}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: () => {},
    });

    this.client.onConnect = (_frame: IFrame) => {
      this._status$.next('CONNECTED');
      this.flushPendingSubs();
    };

    this.client.onStompError = (frame: IFrame) => {
      console.error('[WebSocket] STOMP broker error:', frame.headers['message'], frame.body);
    };

    this.client.onWebSocketClose = () => {
      this._status$.next('DISCONNECTED');
    };

    this.client.activate();
  }

  /** Desconecta limpiamente. No-op si no está conectado. */
  disconnect(): void {
    if (!this.client) return;
    if (this.client.active) {
      this.client.deactivate();
    }
    this._status$.next('DISCONNECTED');
    this.pendingSubs = [];
  }

  /**
   * Suscribe a un topic STOMP. Devuelve un Observable que emite payloads
   * tipados (parsea JSON internamente). Si el cliente aún no está CONNECTED,
   * encola la suscripción y la aplica cuando se conecte.
   */
  subscribe<T>(topic: string): Observable<T> {
    return new Observable<T>((observer) => {
      let activeSub: StompSubscription | null = null;
      let pending: PendingSubscription | null = null;

      const applyNow = (): StompSubscription => {
        return this.client!.subscribe(topic, (message: Message) => {
          try {
            const payload = JSON.parse(message.body) as T;
            observer.next(payload);
          } catch (err) {
            observer.error(err);
          }
        });
      };

      if (this._status$.value === 'CONNECTED' && this.client) {
        activeSub = applyNow();
      } else {
        pending = {
          topic,
          observer: {
            next: (v) => observer.next(v as T),
            error: (e) => observer.error(e),
          },
          cancelled: false,
          apply: () => {
            activeSub = applyNow();
            return activeSub;
          },
        };
        this.pendingSubs.push(pending);
      }

      return () => {
        if (pending) {
          pending.cancelled = true;
        }
        if (activeSub) {
          activeSub.unsubscribe();
        }
      };
    });
  }

  /** Envía un payload al servidor. Loggea warning si no está conectado. */
  send(destination: string, payload: unknown): void {
    if (!this.client?.connected) {
      console.warn(`[WebSocket] send to ${destination} ignored — not connected`);
      return;
    }
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    this.client.publish({ destination, body });
  }

  /** Aplica todas las suscripciones encoladas tras el handshake CONNECT. */
  private flushPendingSubs(): void {
    const queued = this.pendingSubs;
    this.pendingSubs = [];
    for (const sub of queued) {
      if (sub.cancelled) continue;
      try {
        sub.apply();
      } catch (err) {
        sub.observer.error(err);
      }
    }
  }
}
