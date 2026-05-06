import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { firstValueFrom, take, toArray } from 'rxjs';

import { StompClientService } from './stomp-client';

// Mock del módulo @stomp/stompjs — clase mock que sí soporta `new`.
const mockClientInstances: any[] = [];

vi.mock('@stomp/stompjs', () => {
  class MockClient {
    config: any;
    active = false;
    connectHeaders: Record<string, string>;
    onConnect: ((frame: unknown) => void) | null;
    onStompError: ((frame: unknown) => void) | null;
    onWebSocketClose: ((evt: unknown) => void) | null;
    activate: ReturnType<typeof vi.fn>;
    deactivate: ReturnType<typeof vi.fn>;
    publish: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    _subs = new Map<string, (frame: { body: string }) => void>();

    constructor(config: any) {
      this.config = config;
      this.connectHeaders = config?.connectHeaders ?? {};
      this.onConnect = config?.onConnect ?? null;
      this.onStompError = config?.onStompError ?? null;
      this.onWebSocketClose = config?.onWebSocketClose ?? null;

      this.activate = vi.fn(() => {
        this.active = true;
        queueMicrotask(() => this.onConnect && this.onConnect({}));
      });
      this.deactivate = vi.fn(() => {
        this.active = false;
      });
      this.publish = vi.fn();
      this.subscribe = vi.fn((dest: string, cb: (frame: { body: string }) => void) => {
        this._subs.set(dest, cb);
        return { id: dest, unsubscribe: vi.fn() };
      });

      mockClientInstances.push(this);
    }
  }
  return { Client: MockClient };
});

describe('StompClientService', () => {
  let svc: StompClientService;

  beforeEach(() => {
    mockClientInstances.length = 0;
    TestBed.configureTestingModule({});
    svc = TestBed.inject(StompClientService);
  });

  afterEach(() => {
    svc.disconnect();
    vi.clearAllMocks();
  });

  it('connect() instancia un Client con Authorization Bearer y dispara activate', async () => {
    svc.connect({ url: '/ws', jwt: 'my-token' });

    expect(mockClientInstances).toHaveLength(1);
    const client = mockClientInstances[0];
    expect(client.connectHeaders.Authorization).toBe('Bearer my-token');
    expect(client.activate).toHaveBeenCalledOnce();
  });

  it('status$ emite CONNECTING y luego CONNECTED', async () => {
    const statusPromise = firstValueFrom(svc.status$.pipe(take(3), toArray()));
    svc.connect({ url: '/ws', jwt: 't' });
    const states = await statusPromise;
    expect(states).toEqual(['IDLE', 'CONNECTING', 'CONNECTED']);
  });

  it('subscribe<T>() devuelve Observable que parsea JSON del frame', async () => {
    svc.connect({ url: '/ws', jwt: 't' });
    await new Promise((r) => queueMicrotask(() => r(null)));

    const received: any[] = [];
    svc.subscribe<{ type: string }>('/topic/test').subscribe((msg) => received.push(msg));

    const client = mockClientInstances[0];
    expect(client.subscribe).toHaveBeenCalledWith('/topic/test', expect.any(Function));

    // Emitimos un frame STOMP simulado.
    const cb = client._subs.get('/topic/test');
    cb({ body: JSON.stringify({ type: 'GAME_START' }) });

    expect(received).toEqual([{ type: 'GAME_START' }]);
  });

  it('send() invoca client.publish con body serializado', async () => {
    svc.connect({ url: '/ws', jwt: 't' });
    await new Promise((r) => queueMicrotask(() => r(null)));

    svc.send('/app/room.X.draw', { type: 'STROKE', points: [] });
    const client = mockClientInstances[0];
    expect(client.publish).toHaveBeenCalledWith({
      destination: '/app/room.X.draw',
      body: JSON.stringify({ type: 'STROKE', points: [] }),
    });
  });

  it('disconnect() invoca client.deactivate y emite DISCONNECTED', async () => {
    svc.connect({ url: '/ws', jwt: 't' });
    await new Promise((r) => queueMicrotask(() => r(null)));

    svc.disconnect();
    const client = mockClientInstances[0];
    expect(client.deactivate).toHaveBeenCalled();

    const status = await firstValueFrom(svc.status$);
    expect(status).toBe('DISCONNECTED');
  });
});
