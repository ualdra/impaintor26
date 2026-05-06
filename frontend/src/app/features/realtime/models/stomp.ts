// PENDING — Track F (Lobby + WebSocketService) absorberá estos modelos.

export type ConnectionStatus = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface StompConfig {
  /** URL completa del endpoint STOMP, ej: 'ws://localhost:8080/ws' o '/ws' relativo. */
  url: string;
  /** Token JWT crudo (sin el prefijo "Bearer "). */
  jwt: string;
  /** Cuántas veces reintentar la conexión antes de declarar error. */
  reconnectAttempts?: number;
  /** Delay base de reconexión en ms (crece linealmente). */
  reconnectDelayMs?: number;
}
