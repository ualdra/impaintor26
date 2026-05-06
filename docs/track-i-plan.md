# Plan — Track I (P4 segunda responsabilidad, compartida con P3): Flujo del Juego (Frontend)

## Contexto

P4 tiene como segunda responsabilidad **Track I — Flujo del Juego** (Fase 2), compartida con P3 como pareja, con P5 dando soporte de testing y P6 cubriendo específicamente las tareas 2I.8 (UI flotante del impostor) y 2I.9 (SFX). Track I implementa la cara del juego en Angular: el `GameComponent` raíz que vive bajo `/room/:code/game` y que orquesta seis sub-vistas dirigidas por estado (dibujo, galería, votación, desempate, resultado, fin de partida) basándose en los eventos `GameEvent` que emite Track H por WebSocket sobre el `RealtimePublisher` de Track D.

**Estado actual del codebase relevante:**
- **Frontend** ([frontend/](frontend/)): Angular 21 standalone components, Vitest, Tailwind, SSR habilitado. Existe ya un `CanvasComponent` funcional bajo [frontend/src/app/features/game/components/canvas/](frontend/src/app/features/game/components/canvas/) con dibujo local 800×600, paleta, grosor, lápiz/goma. También [frontend/src/app/features/game/services/canvas.ts](frontend/src/app/features/game/services/canvas.ts) y [frontend/src/app/features/game/models/drawing.ts](frontend/src/app/features/game/models/drawing.ts) (con `DrawingStroke` que ya empareja con el `StrokeBroadcast` de Track D). Las rutas de [frontend/src/app/app.routes.ts](frontend/src/app/app.routes.ts) están vacías. **No hay `@stomp/stompjs`** instalado todavía. SSR catch-all en `RenderMode.Prerender`.
- **Backend Track D** (mío, ya merged): emite todos los `GameEvent` definidos en sec 6.2 de CLAUDE.md a `/topic/room.{code}.game` con discriminador `type`, `RoleAssignment` privado a `/user/queue/private`. La forma JSON está fijada por los DTOs sealed records en [backend/src/main/java/com/impaintor/feature/realtime/dto/outbound/](backend/src/main/java/com/impaintor/feature/realtime/dto/outbound/).
- **Backend Track H** (motor de juego): pendiente. Mientras no exista, no hay nadie emitiendo `GameEvent` reales.
- **Frontend Track E** (auth/nav): pendiente. Tampoco hay JWT real en `localStorage` aún.
- **Frontend Track F** (lobby + WebSocketService): pendiente. F va a proveer el wrapper Angular sobre `@stomp/stompjs`; mientras no exista, lo creamos nosotros y F lo absorberá en su merge.

**Decisiones tomadas con el usuario:**
1. **Stubs mínimos** — wrapper `@stomp/stompjs` propio + lectura directa de JWT de `localStorage` con la key acordada + `MockGameEventEmitter` dev-only para desarrollar las vistas sin Track H corriendo.
2. **Client-only rendering para `/room/*`** — el resto del sitio puede prerenderizarse, pero las rutas con WebSocket no.
3. **TDD estricto** con Vitest + TestBed: test → impl → refactor para cada componente y servicio.

**Resultado esperado:** un usuario que entre a `/room/ABC123/game` (asumiendo JWT presente) ve la fase actual del juego, transita entre las seis vistas conforme al flujo de eventos de Track H, y participa (vota, reproduce dibujos en directo, ve resultados) sin que el cliente decida nunca el estado del juego — todo lo dirige el servidor.

---

## Mapa de propiedad de tareas

| Tarea | Propietario | Estado |
|---|---|---|
| 2I.1 — Máquina de estados `GameComponent` | P3 + P4 | Track I (este plan) |
| 2I.2 — `DrawingPhaseView` | P3 + P4 | Track I (este plan) |
| 2I.3 — `GalleryView` | P3 + P4 | Track I (este plan) |
| 2I.4 — `VotingView` | P3 + P4 | Track I (este plan) |
| 2I.5 — `TieBreakView` | P3 + P4 | Track I (este plan) |
| 2I.6 — `VoteResultView` | P3 + P4 | Track I (este plan) |
| 2I.7 — `GameOverView` | P3 + P4 | Track I (este plan) |
| 2I.8 — UI flotante impostor | **P6** | Plan integración (slot + signals expuestos) |
| 2I.9 — SFX y feedback visual | **P6** | Plan integración (Subject<GameEvent>) |

---

## Vista arquitectónica

```
┌────────────────────────────────────────────────────────────────┐
│  Browser (Angular 21 standalone)                                │
│                                                                  │
│   ┌────────────────────────────────────────────────────────┐   │
│   │  GameComponent (container, ruta /room/:code/game)       │   │
│   │  ──────────────────────────────────────────────         │   │
│   │  • Conecta StompClient con JWT del localStorage         │   │
│   │  • Suscribe a /topic/room.{code}.game,                  │   │
│   │             /topic/room.{code}.draw,                    │   │
│   │             /user/queue/private                         │   │
│   │  • Aplica cada GameEvent a GameStateService             │   │
│   │  • Renderiza UNA sub-vista según phase()                │   │
│   │  • Provee slot para ImpostorOverlay (P6)                │   │
│   └────────────────────────────────────────────────────────┘   │
│                              │                                   │
│            ┌─────────────────┼─────────────────┐                 │
│            ▼                 ▼                 ▼                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│   │ DrawingPhase │  │   Gallery    │  │   Voting     │  ...     │
│   │     View     │  │     View     │  │     View     │         │
│   └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │ ws (STOMP)
                       ▼
              backend Track D (ya hecho)
                       │
                       ▼
              backend Track H (PENDIENTE)
                  GameService
                emite GameEvents
```

**Patrón:** "container + presentational components" + signals (Angular 21). El `GameComponent` es el único que tiene side-effects (suscripción WebSocket, aplicación de eventos al store). Las sub-vistas son presentacionales puras: reciben `GameState` por `@Input` y emiten acciones por `@Output`.

---

## Estructura de carpetas propuesta

```
frontend/src/app/
├── features/
│   ├── game/                                        ← Track I trabaja aquí
│   │   ├── containers/
│   │   │   └── game/
│   │   │       ├── game.ts                          (2I.1)
│   │   │       ├── game.html
│   │   │       ├── game.css
│   │   │       └── game.spec.ts
│   │   ├── components/
│   │   │   ├── canvas/                              ← YA EXISTE (Track G)
│   │   │   ├── drawing-phase-view/                  (2I.2)
│   │   │   ├── gallery-view/                        (2I.3)
│   │   │   ├── voting-view/                         (2I.4)
│   │   │   ├── tie-break-view/                      (2I.5)
│   │   │   ├── vote-result-view/                    (2I.6)
│   │   │   └── game-over-view/                      (2I.7)
│   │   ├── models/
│   │   │   ├── drawing.ts                           ← YA EXISTE
│   │   │   ├── game-event.ts                        (NUEVO — discriminated union)
│   │   │   ├── role-assignment.ts                   (NUEVO)
│   │   │   └── game-state.ts                        (NUEVO)
│   │   ├── services/
│   │   │   ├── canvas.ts                            ← YA EXISTE
│   │   │   ├── game-state.ts                        (NUEVO — store con signals)
│   │   │   └── mock-game-event-emitter.ts           (NUEVO — dev-only)
│   │   └── routes.ts                                (NUEVO — sub-routes lazy)
│   └── realtime/                                    ← PENDING — Track F absorberá
│       ├── services/
│       │   ├── stomp-client.ts                      (wrapper @stomp/stompjs)
│       │   └── stomp-client.spec.ts
│       └── models/
│           └── stomp.ts
└── core/                                            ← (opcional) shared
    └── auth/
        └── token.ts                                 (PENDING — Track E lo reemplaza)
```

---

## Modelos TypeScript clave

### `game-event.ts` — discriminated union exhaustivo

Espejo del `GameEvent` sealed interface backend ([backend GameEvent.java](backend/src/main/java/com/impaintor/feature/realtime/dto/outbound/GameEvent.java)). Strict types para que `switch` sea exhaustivo (`never` branch detecta fases nuevas en compilación):

```typescript
export type GameEvent =
  | { type: 'GAME_START'; drawingOrder: number[]; round: number }
  | { type: 'TURN_START'; playerId: number; timeSeconds: number }
  | { type: 'TURN_END'; playerId: number }
  | { type: 'GALLERY_PHASE' }
  | { type: 'VOTE_PHASE'; timeSeconds: number }
  | { type: 'VOTE_RESULT'; eliminated: number; wasImpostor: boolean; topVoted: TopVote[] }
  | { type: 'VOTE_TIE'; tiedPlayers: TopVote[]; timeSeconds: number }
  | { type: 'GUESS_ATTEMPT'; livesRemaining: number; correct: boolean }
  | { type: 'NEW_ROUND'; round: number; drawingOrder: number[] }
  | { type: 'GAME_OVER'; winner: 'PAINTERS' | 'IMPOSTOR'; reason: EndReason; impostorId: number; secretWord: string };

export interface TopVote { id: number; votes: number }
export type EndReason = 'VOTED_OUT' | 'WORD_GUESSED' | 'OUT_OF_LIVES' | 'TIE_NOT_BROKEN' | 'LAST_STANDING';
```

### `role-assignment.ts`

```typescript
export type RoleAssignment =
  | { type: 'ROLE_ASSIGNMENT'; role: 'PAINTER'; word: string }
  | { type: 'ROLE_ASSIGNMENT'; role: 'IMPOSTOR'; hint: string; lives: number };
```

### `game-state.ts` — slice tipado del store

```typescript
export type Phase = 'CONNECTING' | 'DRAWING' | 'GALLERY' | 'VOTING' | 'TIE_BREAK' | 'RESULT' | 'OVER';

export interface GameState {
  phase: Phase;
  round: number;
  drawingOrder: number[];
  currentDrawerId: number | null;
  timeRemainingSec: number;
  myRole: 'PAINTER' | 'IMPOSTOR' | null;
  secretWord: string | null;       // solo PAINTER
  hint: string | null;              // solo IMPOSTOR
  impostorLives: number | null;     // solo IMPOSTOR
  canvases: Map<number, string>;    // playerId → dataURL del snapshot
  myVote: number | null;
  topVoted: TopVote[];
  tiedPlayers: TopVote[];
  eliminated: number | null;
  wasImpostorEliminated: boolean | null;
  gameOver: { winner: 'PAINTERS' | 'IMPOSTOR'; reason: EndReason; impostorId: number; secretWord: string } | null;
}
```

---

## `GameStateService` — store con signals

Servicio `providedIn: 'root'` (singleton por sesión, se resetea al entrar/salir de una sala). API:

- `state: Signal<GameState>` (readonly)
- Selectores derivados via `computed()`: `phase()`, `currentDrawerId()`, `isMyTurn()`, `isImpostor()`, `hint()`, `impostorLives()`
- `applyEvent(event: GameEvent): void` — switch exhaustivo que muta el state según el tipo de evento
- `applyRoleAssignment(role: RoleAssignment): void`
- `applyStrokeBroadcast(stroke: StrokeBroadcast): void` (forwarding al `CanvasService` para que renderice en el canvas espectador)
- `gameEvents$: Subject<GameEvent>` — para que P6 enganche su `AudioService` (2I.9)
- `reset()` — al desconectar

Cada handler de evento se testea unitariamente con TDD: dado un `GameState` inicial + un `GameEvent` X, asertar el `GameState` resultante.

---

## `StompClientService` — wrapper `@stomp/stompjs`

**PENDING — Track F va a absorber/reemplazar este servicio.** Mientras tanto:

- Métodos: `connect(jwt: string): Observable<ConnectionStatus>`, `disconnect()`, `subscribe<T>(destination: string): Observable<T>`, `send<T>(destination: string, body: T): void`
- Auto-reconnect con backoff (5 reintentos, delay creciente)
- Logging dev-only (`environment.dev`)
- Solo se inicializa si `isPlatformBrowser(this.platformId)` (compatibilidad SSR aunque en este proyecto las rutas /room/* sean client-only)
- Tests con `@stomp/stompjs` mock-eado vía Vitest `vi.mock`

---

## `MockGameEventEmitter` — dev-only

Servicio activable mediante query-param `?dev=true` o flag `environment.dev`. Expone un script de eventos secuencial que simula una partida completa: GAME_START → TURN_START × N → TURN_END × N → GALLERY_PHASE → VOTE_PHASE → VOTE_RESULT → NEW_ROUND → ... → GAME_OVER. También un panel UI dev (oculto en prod) con botones para disparar cada `GameEvent` manualmente. Permite:

1. Desarrollar las 6 sub-vistas sin que Track H exista.
2. Que P5 escriba tests de integración del flujo sin levantar backend.
3. Demo offline para presentaciones intermedias.

---

## Plan de implementación TDD por fases

### Fase 1 — Foundation (independiente de upstream)

1. `npm install --save @stomp/stompjs sockjs-client` y `npm install --save-dev @types/sockjs-client`.
2. Crear `proxy.conf.json` para que `ng serve` reenvíe `/api` y `/ws` a `localhost:8080`.
3. Modelos: `game-event.ts`, `role-assignment.ts`, `game-state.ts` (sin tests — son tipos puros).
4. **TDD `GameStateService`**: escribir 11 tests (uno por handler de GameEvent + roleAssignment + reset) → implementar.
5. **TDD `StompClientService`**: tests con mock de `@stomp/stompjs` (connect / subscribe / send / reconnect) → implementar.
6. `MockGameEventEmitter` (dev-only, sin TDD — es scaffolding).

### Fase 2 — Container `GameComponent` (2I.1)

7. Añadir ruta lazy `{ path: 'room/:code/game', loadComponent: () => import('./features/game/containers/game/game').then(m => m.GameComponent) }` a [frontend/src/app/app.routes.ts](frontend/src/app/app.routes.ts).
8. En [frontend/src/app/app.routes.server.ts](frontend/src/app/app.routes.server.ts) añadir entry `{ path: 'room/**', renderMode: RenderMode.Client }` antes del catch-all prerender.
9. **TDD `GameComponent`**: tests con TestBed y `MockGameEventEmitter` inyectado en lugar de `StompClientService`. Casos:
   - `phase` inicial = `CONNECTING`, render `<div>Connecting…</div>`.
   - Tras `GAME_START` → `phase` = `DRAWING`, renderiza `<app-drawing-phase-view>`.
   - Tras `GALLERY_PHASE` → `<app-gallery-view>`.
   - Tras `VOTE_PHASE` → `<app-voting-view>`.
   - Tras `VOTE_TIE` → `<app-tie-break-view>`.
   - Tras `VOTE_RESULT` → `<app-vote-result-view>`.
   - Tras `GAME_OVER` → `<app-game-over-view>`.
   - Al destruir el componente → `StompClientService.disconnect()` invocado.

### Fase 3 — Sub-vistas (2I.2 → 2I.7)

Para cada componente, mismo ciclo TDD: spec con TestBed + `@Input()` mockeado + assertions de DOM render + `@Output()` emit.

| # | Componente | Inputs principales | Outputs | Test fundamentales |
|---|---|---|---|---|
| 2I.2 | `DrawingPhaseView` | `state: GameState`, `playerId: number` | `stroke`, `clear` | renderiza word si PAINTER, renderiza hint si IMPOSTOR, canvas activo si `isMyTurn`, modo espectador si no, timer countdown |
| 2I.3 | `GalleryView` | `state: GameState` | (ninguno — auto-transición servidor) | renderiza grid de N canvas snapshots, muestra timer hasta votación |
| 2I.4 | `VotingView` | `state: GameState` | `vote(playerId)` | renderiza tarjetas por jugador vivo con miniatura, click selecciona voto, timer, deshabilita doble-voto |
| 2I.5 | `TieBreakView` | `state: GameState` | `moveVote(playerId)` | resalta `tiedPlayers`, solo IMPOSTOR ve botón "mover voto", timer countdown |
| 2I.6 | `VoteResultView` | `state: GameState` | (ninguno) | muestra eliminado, revela `wasImpostor`, transición auto |
| 2I.7 | `GameOverView` | `state: GameState` | `playAgain` | revela palabra, hint, impostor, ronda final, botón |

### Fase 4 — Integración con P6 (slots/hooks)

Track I no implementa 2I.8 ni 2I.9, pero sí prepara los puntos de enganche para que P6 conecte sin fricción:

- En `game.html`, añadir `<ng-content select="[impostorOverlay]"></ng-content>` debajo del `router-outlet` de la sub-vista. P6 inyectará su componente flotante ahí, condicional a `gameState.isImpostor()`.
- `GameStateService` expone como API pública: `isImpostor()`, `hint()`, `impostorLives()`, `gameEvents$` (Subject de eventos para SFX). Documentar el contrato en JSDoc.
- Crear `ImpostorOverlaySlot` directiva placeholder con `// PENDING — P6 reemplaza` para que el GameComponent compile en el ínterin.

### Fase 5 — Verificación end-to-end

1. `ng test` → todos verdes (cobertura objetivo ≥80% en `services/` y `containers/`).
2. `ng serve` + `?dev=true` → `MockGameEventEmitter` ejecuta script completo de partida y se ven las seis vistas en secuencia sin errores en consola.
3. `ng build` → bundle producción compila sin warnings de SSR.
4. **Smoke test integrado** (cuando Track H esté disponible):
   - Levantar backend con `docker-compose up`.
   - Abrir 3 pestañas Angular como `/room/TEST/game` con tokens distintos.
   - Crear sala vía REST (Track B), iniciar partida, observar que las tres pestañas reciben `GAME_START` y arrancan flujo.

---

## Dependencias cruzadas (SPI / contratos PENDING)

| Pieza | Dueño | Estado mientras tanto |
|---|---|---|
| `StompClientService` | Track F (Lobby + WS) | Stub propio bajo `features/realtime/`, F lo absorbe en su PR |
| `AuthService.getToken()` | Track E (Auth/Nav) | Helper directo `localStorage.getItem('jwt')` con TODO comment; E proveerá `AuthService` oficial. Documentar la **key acordada `'jwt'`** en CLAUDE.md después |
| `RouterGuard` (auth + sala válida) | Track E | Sin guard ahora; E añade después |
| `GameService` backend (emisor de eventos) | Track H | `MockGameEventEmitter` dev-only cubre desarrollo offline |
| `RoomService.getRoom(code)` REST | Track B | Innecesario para Track I — todos los datos llegan por WebSocket tras el `GAME_START` |
| `ImpostorOverlay` componente | **P6** | `<ng-content select="[impostorOverlay]">` slot + signals expuestos en `GameStateService` |
| `AudioService` SFX | **P6** | `gameEvents$: Subject<GameEvent>` en `GameStateService`; P6 se subscribe |

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Track H emite eventos con forma JSON ligeramente distinta a la spec | Generar typeguards a partir de los DTOs de Track D (yo soy P4, conozco la forma exacta — los espejo en `game-event.ts`). En CI añadir un test de contrato que compare contra fixture JSON sacada del repo backend. |
| `@stomp/stompjs` o WebSocket roto en SSR | Por eso /room/* es **Client-only**. Además, `StompClientService.connect()` arranca con `if (!isPlatformBrowser) return EMPTY`. |
| Vitest + TestBed compatibility en Angular 21 | Validar primero con un test trivial de `GameComponent` antes de escribir suite completa; si rompe, ajustar config en `angular.json` (target unit-test). |
| Strict TypeScript discriminated union no exhaustivo | Cada `switch (event.type)` termina en `default: const _exhaustive: never = event;` para que el compilador detecte fases nuevas. |
| Estado de canvas remoto se desincroniza con `StrokeBroadcast` perdidos | A futuro implementar replay/buffer de strokes. Por ahora aceptamos pérdida si la red corta — Track H puede reenviar snapshots si llega esa necesidad. |
| Conflicto de merge cuando F mergee su `WebSocketService` | Aislamos nuestro `StompClientService` en `features/realtime/`. F coge ese archivo como base y lo refina; si renombra, sustituimos imports con un find/replace. |
| 2I.8 (P6) no llega a tiempo | El IMPOSTOR igual puede jugar — la `DrawingPhaseView` tiene un fallback inline `<input>` para el guess si P6 no provee overlay (marcado `// PENDING — P6 floating overlay`). |

---

## Archivos críticos a crear / modificar

**Crear:**
- [frontend/src/app/features/realtime/services/stomp-client.ts](frontend/src/app/features/realtime/services/stomp-client.ts) + spec
- [frontend/src/app/features/realtime/models/stomp.ts](frontend/src/app/features/realtime/models/stomp.ts)
- [frontend/src/app/features/game/models/game-event.ts](frontend/src/app/features/game/models/game-event.ts)
- [frontend/src/app/features/game/models/role-assignment.ts](frontend/src/app/features/game/models/role-assignment.ts)
- [frontend/src/app/features/game/models/game-state.ts](frontend/src/app/features/game/models/game-state.ts)
- [frontend/src/app/features/game/services/game-state.ts](frontend/src/app/features/game/services/game-state.ts) + spec
- [frontend/src/app/features/game/services/mock-game-event-emitter.ts](frontend/src/app/features/game/services/mock-game-event-emitter.ts)
- [frontend/src/app/features/game/containers/game/game.ts](frontend/src/app/features/game/containers/game/game.ts) + html + css + spec
- [frontend/src/app/features/game/components/drawing-phase-view/](frontend/src/app/features/game/components/drawing-phase-view/) (4 archivos: ts/html/css/spec)
- [frontend/src/app/features/game/components/gallery-view/](frontend/src/app/features/game/components/gallery-view/) (idem)
- [frontend/src/app/features/game/components/voting-view/](frontend/src/app/features/game/components/voting-view/) (idem)
- [frontend/src/app/features/game/components/tie-break-view/](frontend/src/app/features/game/components/tie-break-view/) (idem)
- [frontend/src/app/features/game/components/vote-result-view/](frontend/src/app/features/game/components/vote-result-view/) (idem)
- [frontend/src/app/features/game/components/game-over-view/](frontend/src/app/features/game/components/game-over-view/) (idem)
- [frontend/src/app/core/auth/token.ts](frontend/src/app/core/auth/token.ts) (helper localStorage, PENDING — Track E reemplaza)
- [frontend/proxy.conf.json](frontend/proxy.conf.json)

**Modificar:**
- [frontend/package.json](frontend/package.json) — añadir `@stomp/stompjs` y `sockjs-client` + types
- [frontend/src/app/app.routes.ts](frontend/src/app/app.routes.ts) — ruta lazy `/room/:code/game`
- [frontend/src/app/app.routes.server.ts](frontend/src/app/app.routes.server.ts) — Client-only para `/room/**`
- [frontend/angular.json](frontend/angular.json) — añadir `proxyConfig` al target `serve`

---

## Criterios de finalización

1. `npm test` → todos verdes (≥80% cobertura en `services/` y `containers/game/`).
2. `npm run build` → producción sin errores ni warnings.
3. `ng serve` con `?dev=true` reproduce flujo completo del juego en las seis vistas.
4. `GameStateService` con switch exhaustivo sobre `GameEvent` (compilador valida).
5. Cuando Track F merge: solo cambia el import de `StompClientService` en `GameComponent`, ni un test se rompe.
6. Cuando Track H merge: quitamos `?dev=true` del flujo de demo y la conexión real fluye.
7. Cuando P6 termine 2I.8/2I.9: enchufan en el slot `[impostorOverlay]` y se subscriben a `gameEvents$` sin tocar `GameComponent`.

---

## 4. Decisiones técnicas del plan de Track I

Plan completo en [docs/track-i-plan.md](./track-i-plan.md). Resumen de decisiones tomadas:

### 4.1 Stubs upstream — nivel **mínimo**

- Creamos un `StompClientService` propio bajo `features/realtime/` que envuelve `@stomp/stompjs`. **PENDING — Track F absorberá** este servicio cuando llegue.
- Para JWT leemos `localStorage.getItem('jwt')` con un helper en `core/auth/token.ts`. **PENDING — Track E** proveerá `AuthService` oficial. La key acordada es `'jwt'`.
- Para desarrollo offline (sin Track H), creamos `MockGameEventEmitter` activable con `?dev=true` que dispara la secuencia completa de un partido. Cuando Track H exista, se desactiva el flag y la conexión real fluye.

### 4.2 SSR — Client-only para `/room/*`

- `app.routes.server.ts` añade `{ path: 'room/**', renderMode: RenderMode.Client }` antes del catch-all prerender.
- Razón: las rutas de juego usan WebSocket y JWT en `localStorage`, ninguno disponible en el servidor SSR. El resto del sitio (login, leaderboard, home) puede prerenderizarse normalmente.

### 4.3 TDD estricto con Vitest

- Mismo enfoque que en Track D. Cada componente y servicio: spec con TestBed, expectativas, después implementación, finalmente refactor.
- Cobertura objetivo ≥80% en `services/` y `containers/`.

### 4.4 Patrón container + presentational + signals

- `GameComponent` (container) es el ÚNICO con efectos secundarios: subscripción WebSocket, aplicación de eventos al store. Vive en `containers/game/`.
- Las seis sub-vistas son presentacionales puras: reciben `GameState` por `@Input` y emiten acciones por `@Output`. Viven en `components/*-view/`.
- `GameStateService` es un store con signals (Angular 21). Cada `GameEvent` se aplica vía `applyEvent()` con `switch` exhaustivo (TypeScript `never` branch detecta fases nuevas en compilación).

### 4.5 División P3 / P4 sugerida (negociar entre nosotros)

| Tarea | Sugerencia | Estado |
|---|---|---|
| 2I.1 — Container + state machine | P4 ya lo hizo en sesión solo | ✅ Hecho (ver [p4-log.md sec 4](./p4-log.md#4-track-i-fase-1--2--foundation--container-entregado-2026-05-06)) |
| `MockGameEventEmitter` + `GameStateService` + `StompClientService` + `SpectatorCanvasService` | P4 | ✅ Hecho |
| 2I.2 — `DrawingPhaseView` | P4 (conozco el formato `StrokeBroadcast` de Track D) | ✅ Hecho (ver [p4-log.md sec 5](./p4-log.md#5-track-i--vistas-p4--cierre-46-entregado-2026-05-06)) |
| 2I.3 — `GalleryView` | P3 | 🟡 Placeholder, falta vista real |
| 2I.4 — `VotingView` | P4 | ✅ Hecho |
| 2I.5 — `TieBreakView` | P3 | 🟡 Placeholder, falta vista real |
| 2I.6 — `VoteResultView` | P3 | 🟡 Placeholder, falta vista real |
| 2I.7 — `GameOverView` | P4 | ✅ Hecho |
| 2I.8 — UI flotante impostor | **P6** (no nosotros) | Slot listo en `game.html`. Fallback inline activo en `DrawingPhaseView` mientras tanto |
| 2I.9 — SFX y feedback | **P6** (no nosotros) | `gameEvents$` listo en `GameStateService` |

> Es una propuesta. Si prefieres otro reparto, lo hablamos.

### 4.6 Decisión cerrada — populación de `state.canvases` vía `SpectatorCanvasService` (Opción B)

> **Estado:** ✅ Decidido por P4 (autonomía concedida por el usuario). Reversible si P3 lo discute al pair-program.
> **Implementado:** sí, ver `frontend/src/app/features/game/services/spectator-canvas.ts`.

**Problema.** `GameState.canvases: Map<number, string>` estaba declarado en el modelo pero `GameStateService` no lo poblaba. `VotingView` (P4) y `GalleryView` (P3) necesitan miniaturas de los dibujos de la ronda.

**Opciones consideradas:**

- **Opción A** — `GameStateService` lo gestiona internamente. Centralizado pero **acopla el servicio al DOM** (`HTMLCanvasElement`/`OffscreenCanvas`), rompe los 18 tests existentes (jsdom no implementa Canvas API completa) y mezcla concerns (estado de fase del juego ≠ replay de strokes).
- **Opción B (elegida)** — Servicio nuevo `SpectatorCanvasService` aparte, se subscribe a `gameStateService.gameEvents$` y a un input de strokes, mantiene canvas off-screen por jugador y expone `snapshots: Signal<Record<id, dataUrl>>`.
- **Opción C** — Cada vista que muestra miniaturas gestiona sus propios canvas internos. Duplicación entre `GalleryView` y `VotingView`, posible inconsistencia si ambas se muestran simultáneamente, y N×M canvases en RAM en el peor caso.

**Por qué Opción B:**

1. **`GameStateService` queda puro.** Solo maneja `GameEvent`/`RoleAssignment`, no toca DOM. Los 18 tests existentes no cambian.
2. **Single responsibility.** El replay de strokes es un concern distinto del state machine de fases. Un servicio por concern, cada uno testeable en aislamiento.
3. **Reutilizable.** `DrawingPhaseView` (modo espectador), `VotingView` y `GalleryView` consumen la misma fuente. P6 podría usarla también si decide mostrar previsualización en el `ImpostorOverlay`.
4. **Estable frente a Track G/F.** Su contrato es `replayStroke(s) / clearPlayer(id) / snapshots(): Signal<Record<id,dataUrl>>` — invariante aunque cambien internals del Canvas o del WebSocket.
5. **SSR-safe.** Si `!isPlatformBrowser`, todos los métodos son no-op.

**Notas de implementación.**

- El servicio mantiene `HTMLCanvasElement` off-screen (no insertados en DOM, vía `document.createElement('canvas')`) en un `Map<playerId, HTMLCanvasElement>`, lazy-creados al recibir el primer stroke de un jugador.
- En cada stroke: dibuja en el canvas correspondiente y actualiza el signal `snapshots` con el nuevo `toDataURL('image/png')`. Es un pequeño coste de perf por stroke (≤8 jugadores × ≤30 strokes/min) pero simplifica el binding (`<img [src]="snapshots()[id]">`) en las vistas.
- Reset automático: el servicio se subscribe a `gameStateService.gameEvents$` y limpia todos los canvases al recibir `GAME_START` o `NEW_ROUND`.
- `GameComponent` se subscribe a `/topic/room.{code}.draw` y forwards los `StrokeBroadcast`/`ClearCanvasBroadcast` al servicio.
- En modo `?dev=true`, los snapshots quedan vacíos porque el `MockGameEventEmitter` no simula strokes — aceptable para demo de fases, marcado en doc del servicio.

**Reversibilidad.** Si P3 al pair-program prefiere otra opción, los cambios están aislados a un único archivo (`spectator-canvas.ts` + spec) y al wiring en `GameComponent`. Migrar a A o C es cuestión de mover ese código.

---

## 5. Coordinación cruzada con otros tracks

Lista de acciones que activan/desactivan piezas de Track I cuando los demás tracks merge:

- **Track A merge** → borrar `feature/user/models/User.java` (stub) y verificar que la `User` de Track A respeta los campos `id`, `email`, `username`, `password`, `elo`, `gamesPlayed`, `gamesWon`, `createdAt`. Si no, ajustar `Room.java`/`RoomController.java` (Track B).
- **Track A merge** → confirmar que su `JwtTokenProvider` o equivalente firma con el secret de `impaintor.realtime.jwt.secret`. Si Track A trae su propio secret, unificar en `application.yml`.
- **Track A merge** → su `SecurityFilterChain` real desactivará `RealtimeSecurityConfig` automáticamente vía `@ConditionalOnMissingBean(SecurityFilterChain.class)`.
- **Track B merge** → su impl de `RoomMembershipChecker` desactivará `AlwaysAllowMembershipChecker` automáticamente vía `@ConditionalOnMissingBean(RoomMembershipChecker.class)`.
- **Track B merge** → asegurar que `RoomService.create()` invoque `RoomTopicRegistry.registerRoom(code)` y `RoomService.delete()` invoque `unregisterRoom(code)`.
- **Track H merge** → su `GameService` (o equivalente) implementará `GameInputHandler` y desactivará `LoggingGameInputHandler` vía `@ConditionalOnMissingBean(GameInputHandler.class)`. También inyectará `RealtimePublisher` para emitir eventos.
- **Track E merge (frontend)** → su `AuthService` reemplazará el helper directo `frontend/src/app/core/auth/token.ts`. Buscar imports de `getStoredToken` y migrar a `AuthService.getToken()`.
- **Track F merge (frontend)** → su `WebSocketService` reemplazará nuestro `StompClientService` bajo `features/realtime/`. Cambiar imports en `GameComponent`.
- **P6 trabaja en 2I.8 / 2I.9** → enchufa su `ImpostorOverlay` en el slot `[impostorOverlay]` y subscribe `AudioService` a `GameStateService.gameEvents$`. Sin tocar nuestros componentes.

---

## 6. Cómo sustituir un placeholder por una vista real (recipe TDD)

Aplica a las 6 sub-vistas (2I.2 → 2I.7). Suponiendo que se quiere implementar `GalleryView`:

1. Abrir `frontend/src/app/features/game/components/gallery-view/gallery-view.spec.ts`.
2. Borrar el test placeholder y escribir los tests TDD reales (cuadrícula con N items, transición por timer, etc.).
3. Reemplazar la implementación en `gallery-view.{ts,html,css}`. El `state: GameState` ya está disponible como `@Input` y contiene todo lo necesario (`canvases`, `drawingOrder`, `timeRemainingSec`, …).
4. **Ningún otro archivo necesita tocarse** — el container ya enchufa el componente correctamente vía `@switch`.
5. `npm test` valida que los tests del container siguen verdes (solo dependen del selector `[data-testid="gallery-phase"]`, así que mantén ese atributo en el wrapper raíz del HTML real).

Si la vista necesita emitir acciones al servidor (voto, mover voto, jugar otra vez, stroke), añadir un `@Output` al componente y conectar el handler en `game.html` mediante `(voteCast)="onVoteCast($event)"`. El método nuevo en `GameComponent` invoca `this.stomp.send(...)`.
