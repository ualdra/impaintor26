import { Injectable, inject } from '@angular/core';
import { Client, Message, StompSubscription } from '@stomp/stompjs';
import { BehaviorSubject, Observable, Subject, filter } from 'rxjs';
import { UserService } from './user.service'; // Asumiendo que el UserService existe y tiene el token

export enum ConnectionState {
  DISCONNECTED,
  CONNECTING,
  CONNECTED
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private client: Client;
  private connectionState$ = new BehaviorSubject<ConnectionState>(ConnectionState.DISCONNECTED);
  private readonly userService = inject(UserService);

  constructor() {
    this.client = new Client({
      // Usaremos la ruta absoluta basada en el origen para que funcione tanto en dev como prod
      brokerURL: `ws://${window.location.hostname}:8080/ws`,
      debug: (str: string) => {
        // console.log('STOMP: ' + str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = (frame: any) => {
      console.log('STOMP Connected');
      this.connectionState$.next(ConnectionState.CONNECTED);
    };

    this.client.onStompError = (frame: any) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    this.client.onWebSocketClose = () => {
      console.log('STOMP Connection Closed');
      this.connectionState$.next(ConnectionState.DISCONNECTED);
    };
  }

  public connect(): void {
    if (this.connectionState$.value === ConnectionState.CONNECTED) return;
    
    this.connectionState$.next(ConnectionState.CONNECTING);
    
    // Obtener token para auth (según Track 1D.2)
    // Asumimos que UserService guarda el token en localStorage o lo provee
    const token = localStorage.getItem('token');
    if (token) {
      this.client.connectHeaders = {
        Authorization: `Bearer ${token}`
      };
    }

    this.client.activate();
  }

  public disconnect(): void {
    if (this.client.active) {
      this.client.deactivate();
    }
    this.connectionState$.next(ConnectionState.DISCONNECTED);
  }

  public getConnectionState(): Observable<ConnectionState> {
    return this.connectionState$.asObservable();
  }

  /**
   * Se suscribe a un topic STOMP. Si el cliente no está conectado, espera a que lo esté.
   */
  public subscribe(topic: string): Observable<Message> {
    return new Observable<Message>(observer => {
      let subscription: StompSubscription | null = null;

      // Esperar a estar conectados
      const stateSub = this.connectionState$
        .pipe(filter(state => state === ConnectionState.CONNECTED))
        .subscribe(() => {
          if (!subscription && this.client.connected) {
            subscription = this.client.subscribe(topic, (message: Message) => {
              observer.next(message);
            });
          }
        });

      return () => {
        stateSub.unsubscribe();
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    });
  }

  public publish(destination: string, body: any): void {
    if (this.client.connected) {
      this.client.publish({
        destination,
        body: typeof body === 'string' ? body : JSON.stringify(body)
      });
    } else {
      console.warn(`[STOMP] Intentó enviar a ${destination} pero no está conectado.`);
    }
  }
}
