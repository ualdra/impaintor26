import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { WebSocketService } from './websocket.service';

/**
 * Tests de WebSocketService.
 *
 * Mockeamos @stomp/stompjs con una clase MockClient que almacena la instancia
 * activa en `mock.client`. Los callbacks (onConnect, etc.) son propiedades
 * escritas por WebSocketService DESPUÉS de construir el Client, así que los
 * tests disparan onConnect manualmente en lugar de depender de activate().
 *
 * Nota de diseño del mock: `mock` se referencia solo dentro del constructor de
 * MockClient, no en la función factory. Esto evita el TDZ (zona muerta temporal)
 * que ocurre cuando vi.mock eleva la llamada antes de que se evalúen las const.
 */

const mock = { client: null as any };

vi.mock('@stomp/stompjs', () => {
  class MockClient {
    active = false;
    connected = false;
    onConnect: any = undefined;
    onStompError: any = undefined;
    onWebSocketClose: any = undefined;
    activate: ReturnType<typeof vi.fn>;
    deactivate: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    publish: ReturnType<typeof vi.fn>;

    constructor(_config: any) {
      this.activate = vi.fn(() => { this.active = true; });
      this.deactivate = vi.fn(() => { this.active = false; });
      this.subscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
      this.publish = vi.fn();
      mock.client = this;
    }
  }
  return { Client: MockClient };
});

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    mock.client = null;

    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    service = TestBed.inject(WebSocketService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('connect activa el cliente STOMP', () => {
    service.connect({ url: '/ws', jwt: 'token' });
    expect(mock.client.activate).toHaveBeenCalled();
  });

  it('connect es idempotente — segunda llamada no re-activa', () => {
    service.connect({ url: '/ws', jwt: 'token' });
    mock.client.active = true;
    const firstActivateSpy = mock.client.activate;
    service.connect({ url: '/ws', jwt: 'token' });
    expect(firstActivateSpy).toHaveBeenCalledTimes(1);
  });

  it('disconnect desactiva el cliente', () => {
    service.connect({ url: '/ws', jwt: 'token' });
    mock.client.active = true;
    service.disconnect();
    expect(mock.client.deactivate).toHaveBeenCalled();
  });

  it('subscribe después de CONNECTED se aplica inmediatamente', () => {
    service.connect({ url: '/ws', jwt: 'token' });
    mock.client.onConnect?.({});

    const sub = service.subscribe<{ foo: string }>('/topic/test').subscribe();
    expect(mock.client.subscribe).toHaveBeenCalledWith('/topic/test', expect.any(Function));
    sub.unsubscribe();
  });

  it('subscribe antes de CONNECT encola y se aplica al conectar', () => {
    const received: unknown[] = [];
    service.connect({ url: '/ws', jwt: 'token' });
    service.subscribe<{ foo: string }>('/topic/early').subscribe((v) => received.push(v));
    expect(mock.client.subscribe).not.toHaveBeenCalled();

    mock.client.onConnect?.({});
    expect(mock.client.subscribe).toHaveBeenCalledWith('/topic/early', expect.any(Function));
  });

  it('unsubscribe en una sub pendiente la marca como cancelada y no se aplica al conectar', () => {
    service.connect({ url: '/ws', jwt: 'token' });
    const sub = service.subscribe<{ foo: string }>('/topic/cancel').subscribe();
    sub.unsubscribe();

    mock.client.onConnect?.({});
    expect(mock.client.subscribe).not.toHaveBeenCalled();
  });

  it('subscribe parsea Message.body como JSON y emite payload tipado', () => {
    const received: { foo: string }[] = [];
    service.connect({ url: '/ws', jwt: 'token' });
    mock.client.onConnect?.({});

    let capturedHandler: ((msg: { body: string }) => void) | undefined;
    mock.client.subscribe.mockImplementation((_topic: string, handler: any) => {
      capturedHandler = handler;
      return { unsubscribe: vi.fn() };
    });

    service.subscribe<{ foo: string }>('/topic/test').subscribe((v) => received.push(v));
    capturedHandler?.({ body: JSON.stringify({ foo: 'bar' }) });

    expect(received).toEqual([{ foo: 'bar' }]);
  });

  it('send publica al cliente cuando está conectado', () => {
    service.connect({ url: '/ws', jwt: 'token' });
    mock.client.connected = true;

    service.send('/app/test', { hello: 'world' });
    expect(mock.client.publish).toHaveBeenCalledWith({
      destination: '/app/test',
      body: JSON.stringify({ hello: 'world' }),
    });
  });

  it('send loggea warning si no está conectado', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    service.connect({ url: '/ws', jwt: 'token' });
    // mock.client.connected sigue siendo false (por defecto)
    service.send('/app/test', { hello: 'world' });
    expect(warnSpy).toHaveBeenCalled();
    expect(mock.client.publish).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('en SSR (no-browser), connect es no-op', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    const ssrService = TestBed.inject(WebSocketService);
    ssrService.connect({ url: '/ws', jwt: 'token' });
    expect(mock.client).toBeNull();
  });
});
