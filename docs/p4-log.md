# P4 — Log de trabajo

Diario personal de P4 (José). Registra qué se hizo, cuándo y por qué. No es un handoff: para reparto y planificación de Track I, ver [track-i-plan.md](./track-i-plan.md). Para SPIs/contratos disponibles, ver el código bajo `com.impaintor.feature.realtime` y los comentarios `// PENDING — Track X`.

---

## Índice (orden cronológico)

1. [Track D — Infraestructura en Tiempo Real (Fase 1, completado)](#1-track-d--infraestructura-en-tiempo-real)
2. [CI backend (GitHub Actions)](#2-ci-backend-github-actions)
3. [Stub temporal de `User` (PENDING — Track A)](#3-stub-temporal-de-user-pending--track-a)
4. [Track I Fase 1 + 2 — foundation + container (entregado 2026-05-06)](#4-track-i-fase-1--2--foundation--container-entregado-2026-05-06)
5. [Track I — vistas P4 + cierre §4.6 (entregado 2026-05-06)](#5-track-i--vistas-p4--cierre-46-entregado-2026-05-06)

---

## 1. Track D — Infraestructura en Tiempo Real

Track D cubre las tareas **1D.1 → 1D.6** de la Fase 1: configuración WebSocket/STOMP/RabbitMQ, validación JWT en CONNECT, gestión de topics por sala, retransmisión de trazos, difusión de eventos del juego y entrega de mensajes privados.

### 1.1 Resumen de entregables

- **Phase 0 catch-up** (no estaba hecho cuando arranqué):
  - Clase main: [backend/src/main/java/com/impaintor/ImpaintorApplication.java](../backend/src/main/java/com/impaintor/ImpaintorApplication.java)
  - Boilerplate de test reubicado de `com.example.demo` a `com.impaintor`
  - `pom.xml` con jjwt 0.12.6, H2 (test scope), `groupId/artifactId` corregidos a `com.impaintor:impaintor-backend`
  - `application.yml` con env-vars (compatible Docker), `application-test.yml` con H2 y SimpleBroker
  - [backend/Dockerfile](../backend/Dockerfile) (multi-stage maven → jre-alpine)
  - [docker-compose.yml](../docker-compose.yml) con backend + Postgres + RabbitMQ con plugin STOMP en :61613

- **Track D** (todo bajo `com.impaintor.feature.realtime`):
  - `config/WebSocketConfig` — `@EnableWebSocketMessageBroker`, modo `relay` (RabbitMQ) en producción, `simple` (in-memory) en tests, según el property `impaintor.realtime.broker.mode`
  - `config/RealtimeProperties` — `@ConfigurationProperties("impaintor.realtime")` tipado con records
  - `config/RealtimeSecurityConfig` — `SecurityFilterChain` mínimo, `@ConditionalOnMissingBean` para que Track A lo reemplace
  - `config/RealtimeStubsConfig` — registra los stubs de los SPIs vía `@Bean @ConditionalOnMissingBean`
  - `security/TokenValidator` (interfaz SPI) + `JwtTokenValidator` (impl real con jjwt) + `JwtChannelInterceptor` + `StompPrincipal` + `AuthenticatedUser`
  - `topic/RoomTopicRegistry` (registro thread-safe) + `RoomMembershipChecker` (SPI) + `AlwaysAllowMembershipChecker` (stub)
  - `dto/inbound/`: `DrawCommand` sealed con `StrokeMessage` y `ClearCanvasMessage` (Jackson polymorphic con `type` discriminator), `VoteMessage`, `GuessMessage`, `Point`
  - `dto/outbound/`: `StrokeBroadcast`, `ClearCanvasBroadcast`, `GameEvent` sealed con 10 variantes record (Jackson `@JsonTypeInfo` por `type`), `RoleAssignment` sealed (Painter / Impostor), `GuessResult`
  - `controller/DrawWebSocketController` — `@MessageMapping("/room.{code}.draw")` único con discriminador `type`, anti-spoofing (usa el id del Principal, no del payload)
  - `controller/GameInputWebSocketController` — `@MessageMapping("/room.{code}.vote")` y `/guess`, delega a `GameInputHandler`
  - `service/RealtimePublisher` — fachada tipada sobre `SimpMessagingTemplate` para que Track H emita eventos sin conocer detalles STOMP/RabbitMQ
  - `service/GameInputHandler` (SPI) + `LoggingGameInputHandler` (stub con logs)

### 1.2 Tests (TDD estricto, 39/39 verdes)

- 6 `JwtTokenValidatorTest`
- 6 `JwtChannelInterceptorTest`
- 5 `RoomTopicRegistryTest`
- 7 `RealtimePublisherTest`
- 4 `DrawWebSocketControllerTest`
- 4 `GameInputWebSocketControllerTest`
- 3 `WebSocketConfigTest`
- 3 `WebSocketIntegrationTest` (cliente STOMP real con SimpleBroker)
- 1 `ImpaintorApplicationTests`

### 1.3 Decisiones de diseño relevantes

1. **Modo broker condicional vía properties** (no `@Profile`) — más explícito y testeable.
2. **DTOs sealed + records con discriminador `type` en JSON** — espejo del formato de la sec 6.2 de CLAUDE.md, validable por Jackson.
3. **Anti-spoofing en controllers**: el `playerId`/`voterId` siempre se lee del `Principal` autenticado, no del payload del cliente.
4. **`MessageHeaderAccessor.getAccessor` con mutación in-place** en `JwtChannelInterceptor` — única forma de que el `Principal` propague a la sesión WebSocket en frames SEND posteriores. Necesita `setLeaveMutable(true)` en los headers (Spring lo hace por defecto en producción; en los tests unitarios lo añadimos manualmente).
5. **`@ConditionalOnMissingBean` solo en `@Bean`** (no en `@Component` — no funciona ahí). Por eso los stubs son `@Bean` en `RealtimeStubsConfig`.
6. **Test de integración con `SimpleBroker` en lugar de Testcontainers RabbitMQ** — más rápido, no requiere Docker en CI, y verifica el wiring real de mappings + broadcast.

### 1.4 Cómo correrlo

```bash
cd backend
./mvnw test                  # 39 tests verdes
./mvnw -DskipTests package   # JAR ejecutable
docker-compose up --build    # stack completo (backend + db + rabbitmq)
```

Consola RabbitMQ (dev): http://localhost:15672 (impaintor / impaintor).

---

## 2. CI backend (GitHub Actions)

Workflow: [.github/workflows/backend-ci.yml](../.github/workflows/backend-ci.yml)

**Triggers:**
- `push` a la rama `dev` con cambios bajo `backend/**` o el propio workflow.
- `pull_request` contra `main` con cambios bajo `backend/**` o el propio workflow.

**Pipeline:**
1. `actions/checkout@v4`
2. `actions/setup-java@v4` con JDK 17 Temurin y cache Maven (~/.m2)
3. `chmod +x mvnw` (mvnw está tracked como `100644`, no como ejecutable, para evitar problemas en checkouts Windows)
4. `./mvnw -B -DskipTests compile`
5. `./mvnw -B test`

Si tocas algo en `frontend/`, `docker-compose.yml` o `CLAUDE.md`, **el CI no corre** — diseño deliberado para que P5/P6/Track E,F,G no sufran nuestros tiempos de CI.

---

## 3. Stub temporal de `User` (PENDING — Track A)

### 3.1 Por qué existe

El día del merge a `dev`, Track B había mergeado `Room` y `RoomController` con `import com.impaintor.feature.user.models.User;` en dos archivos:

- [backend/src/main/java/com/impaintor/feature/room/models/Room.java](../backend/src/main/java/com/impaintor/feature/room/models/Room.java) — campo `@ManyToMany List<User> playersNames`.
- [backend/src/main/java/com/impaintor/feature/room/controller/RoomController.java](../backend/src/main/java/com/impaintor/feature/room/controller/RoomController.java) — `@RequestBody User user` en endpoints `join`/`leave`.

Pero **Track A todavía no estaba mergeado** — el paquete `com.impaintor.feature.user.models` no existía y la compilación entera (todos los tests, todo el build) estaba rota. El CI lo expuso al primer `mvn clean compile`.

### 3.2 Solución temporal

Creé un **stub mínimo** en [backend/src/main/java/com/impaintor/feature/user/models/User.java](../backend/src/main/java/com/impaintor/feature/user/models/User.java) con los campos de la sec 4.1 de CLAUDE.md (`id`, `email`, `username`, `password`, `elo`, `gamesPlayed`, `gamesWon`, `createdAt`) más Lombok `@Getter`/`@Setter`/`@NoArgsConstructor`.

Es un `@Entity` con `@Table(name = "users")` para que el `@JoinTable(inverseJoinColumns = @JoinColumn(name = "user_id"))` de `Room` se resuelva.

### 3.3 Cuándo borrarlo

Cuando Track A merge su `User.java` real. Si los nombres de campos de la sec 4.1 de CLAUDE.md se respetan, el merge es trivial. Recordatorio buscable:

```bash
grep -r "STUB PROVISIONAL" backend/src/main/java
```

---

## 4. Track I Fase 1 + 2 — foundation + container (entregado 2026-05-06)

Ejecución parcial del [plan de Track I](./track-i-plan.md): Foundation (modelos + servicios + mock) y container con state machine. Las 6 sub-vistas (Fase 3) quedan como **placeholders visuales** para que cualquier sustitución TDD posterior (P3 o yo) no toque el container.

**Comando de verificación:** `cd frontend && npm test` → 37 tests míos verdes (1 test rojo en `app.spec.ts` preexistente del scaffold de Track G — Canvas API en jsdom; ajeno a Track I y al trabajo P4).
**Build de producción:** `npm run build` OK, lazy chunk `game` separado correctamente, SSR sin warnings nuevos.

### 4.1 Estado por archivo (qué es qué)

| Archivo | Estado | Notas |
|---|---|---|
| `frontend/package.json` | ✅ Implementado | añadidos `@stomp/stompjs`, `sockjs-client`, `@types/sockjs-client` |
| `frontend/proxy.conf.json` | ✅ Implementado | reenvía `/api` y `/ws` al backend en :8080 |
| `frontend/angular.json` | ✅ Implementado | `serve.options.proxyConfig` apuntando al proxy |
| `frontend/src/app/app.routes.ts` | ✅ Implementado | ruta lazy `/room/:code/game` |
| `frontend/src/app/app.routes.server.ts` | ✅ Implementado | `RenderMode.Client` para `/room/**`, prerender para el resto |
| `frontend/src/app/core/auth/token.ts` | ⏸️ PENDING — Track E | helper `getStoredToken()` lee `localStorage['jwt']`. Track E lo reemplaza con `AuthService.getToken()` |
| `frontend/src/app/features/realtime/models/stomp.ts` | ⏸️ PENDING — Track F | tipos `ConnectionStatus`, `StompConfig` |
| `frontend/src/app/features/realtime/services/stomp-client.ts` | ⏸️ PENDING — Track F | wrapper @stomp/stompjs SSR-safe. **Funcional y testeado**, pero F aporta su versión definitiva |
| `frontend/src/app/features/realtime/services/stomp-client.spec.ts` | ✅ Implementado | 5 tests verdes (connect/status$/subscribe/send/disconnect) |
| `frontend/src/app/features/game/models/game-event.ts` | ✅ Implementado | discriminated union de los 10 GameEvent + `StrokeBroadcast`/`ClearCanvasBroadcast` (espejo del backend Track D) |
| `frontend/src/app/features/game/models/role-assignment.ts` | ✅ Implementado | RoleAssignment + GuessResult + PrivateMessage |
| `frontend/src/app/features/game/models/game-state.ts` | ✅ Implementado | `Phase`, `GameState`, `INITIAL_STATE` |
| `frontend/src/app/features/game/services/game-state.ts` | ✅ Implementado | store con signals + reducer exhaustivo + `gameEvents$` para SFX (P6) |
| `frontend/src/app/features/game/services/game-state.spec.ts` | ✅ Implementado | 18 tests verdes — un caso por handler de evento + selectores + reset |
| `frontend/src/app/features/game/services/mock-game-event-emitter.ts` | 🟡 Stub propio (dev-only) | reproduce un guion de 18 eventos para que `?dev=true` funcione sin backend Track H |
| `frontend/src/app/features/game/containers/game/game.{ts,html,css}` | ✅ Implementado | container con state machine, `@switch` exhaustivo, slot `[impostorOverlay]` para P6 |
| `frontend/src/app/features/game/containers/game/game.spec.ts` | ✅ Implementado | 7 tests verdes — uno por fase + caso "no autenticado" + caso "ngOnDestroy desconecta" |
| `frontend/src/app/features/game/components/drawing-phase-view/*` | 🟡 Placeholder propio | renderiza `<h2>Fase: DRAWING</h2><pre>{{state\|json}}</pre>` (sec 2I.2) |
| `frontend/src/app/features/game/components/gallery-view/*` | 🟡 Placeholder propio | idem (sec 2I.3) |
| `frontend/src/app/features/game/components/voting-view/*` | 🟡 Placeholder propio | idem (sec 2I.4) |
| `frontend/src/app/features/game/components/tie-break-view/*` | 🟡 Placeholder propio | idem (sec 2I.5) |
| `frontend/src/app/features/game/components/vote-result-view/*` | 🟡 Placeholder propio | idem (sec 2I.6) |
| `frontend/src/app/features/game/components/game-over-view/*` | 🟡 Placeholder propio | idem (sec 2I.7) |

### 4.2 Lo que NO está implementado (consciente)

- **Sub-vistas reales (2I.2 → 2I.7)**: solo placeholders — la sustitución concreta sigue las indicaciones del plan.
- **2I.8 — UI flotante del impostor (P6)**: ya hay slot `<ng-content select="[impostorOverlay]">` en `game.html` y signals expuestos en `GameStateService` (`isImpostor()`, `hint()`, `impostorLives()`).
- **2I.9 — SFX (P6)**: `GameStateService.gameEvents$` (Subject) está listo para que `AudioService` se subscribe.
- **Tests de integración con backend Track H real**: Track H no existe todavía. Yo controlo ambos espejos JSON (backend Track D + frontend Track I), riesgo bajo cuando llegue.
- **Estilo visual**: Tailwind disponible pero los placeholders son CSS plano — no quería condicionar a Track K.

### 4.3 Decisiones técnicas de esta entrega

1. **Mock del `Client` de `@stomp/stompjs` con clase, no `vi.fn().mockImplementation`** — `vi.fn()` no es invocable con `new`. Patrón de mock anotado en `stomp-client.spec.ts`.
2. **Reducer exhaustivo con `default: const _: never = e`** — TypeScript valida en compilación que cualquier `GameEvent` nuevo tiene su case. Esto pillará bugs de regresión cuando crezca la spec.
3. **Switch en template con `@switch (gameState.phase())`** — Angular 21 control flow nativo, sin `*ngIf` chains. Más legible.
4. **`MockGameEventEmitter` con `setTimeout` no inyecta timer** — para tests del container uso `mock.emit(event)` sincrónico, no `playFullGameScript()`. El script real solo se usa en demo `?dev=true`.
5. **`Storage.prototype.getItem` con `vi.spyOn` en tests** — no `window.localStorage.__proto__` (el strict de TS lo bloquea).

### 4.4 Cómo verificar el estado actual

```bash
cd frontend
npm install      # solo la primera vez
npm test         # 37 tests verdes
npm run build    # bundle producción OK
npm start        # ng serve en :4200

# En el navegador:
#   http://localhost:4200/room/TEST/game?dev=true   → demo modo offline (placeholders avanzando)
#   http://localhost:4200/room/TEST/game            → modo real (requiere JWT en localStorage y backend up)
```

En el demo `?dev=true` se ve la cabecera azul "🛠️ MODO DEV", luego cada placeholder cambia automáticamente cada ~1.5 s siguiendo el guion: CONNECTING → DRAWING → … → OVER.

---

## 5. Track I — vistas P4 + cierre §4.6 (entregado 2026-05-06)

Segunda entrega de Track I: implementación real de las 3 sub-vistas que me tocan según el reparto del [plan §4.5](./track-i-plan.md), más el `SpectatorCanvasService` que cierra el gap de §4.6 con la opción B (servicio dedicado).

**Comando de verificación:** `cd frontend && npm test` → 77 tests míos verdes (1 test rojo en `app.spec.ts` preexistente del scaffold de Track G — Canvas API en jsdom; ajeno).
**Build de producción:** `npm run build` OK, lazy chunk `game` ahora 47 kB (antes 34 kB) con las vistas reales incluidas.

### 5.1 Decisión cerrada — §4.6 Opción B

Resolví el gap de populación de `state.canvases` con un servicio dedicado `SpectatorCanvasService` (Opción B). Razones documentadas en [track-i-plan.md §4.6](./track-i-plan.md). Decisión tomada autónomamente con autorización explícita del usuario y marcada como **reversible** si P3 al pair-program prefiere otra opción.

### 5.2 Estado por archivo (delta sobre la entrega anterior)

| Archivo | Estado | Notas |
|---|---|---|
| `frontend/src/app/features/game/services/spectator-canvas.ts` | ✅ Implementado | Mantiene HTMLCanvasElement off-screen por jugador, expone `snapshots` signal, reset auto en GAME_START/NEW_ROUND |
| `frontend/src/app/features/game/services/spectator-canvas.spec.ts` | ✅ Implementado | 9 tests verdes (replay, clear, reset por evento, dispatch broadcast) |
| `frontend/src/app/features/game/components/drawing-phase-view/*` | ✅ Implementado (real) | Canvas activo si PAINTER + mi turno; modo espectador con `<img>` en otro caso; banner palabra/pista/vidas; caja inline impostor (fallback hasta P6 entregue 2I.8) |
| `frontend/src/app/features/game/components/drawing-phase-view/*.spec.ts` | ✅ Implementado | 11 tests verdes (rol, my-turn vs espectador, fallback impostor, timer, no-drawer) |
| `frontend/src/app/features/game/components/voting-view/*` | ✅ Implementado (real) | Grid de tarjetas con miniatura del SpectatorCanvasService; click vota; lock tras voto; excluye eliminados |
| `frontend/src/app/features/game/components/voting-view/*.spec.ts` | ✅ Implementado | 9 tests verdes (cards, miniaturas, voteCast emit, lock, eliminado, timer, sin-snapshot) |
| `frontend/src/app/features/game/components/game-over-view/*` | ✅ Implementado (real) | Banner ganador, reveal de palabra/pista/impostor/rondas, traducción humana de EndReason, botón playAgain |
| `frontend/src/app/features/game/components/game-over-view/*.spec.ts` | ✅ Implementado | 11 tests verdes (winner, reveal, parametric por EndReason, playAgain emit, defensivo si gameOver null) |
| `frontend/src/app/features/game/containers/game/game.{ts,html}` | ✅ Modificado | Inyecta SpectatorCanvasService; nueva subscripción a `/topic/room.{code}.draw`; nuevos handlers `sendStroke`, `sendVote`, `sendGuess`, `onPlayAgain`; pasa `myPlayerId` a las vistas (en dev = 42) |

### 5.3 Lo que sigue siendo placeholder (para P3)

- 2I.3 `GalleryView` — falta cuadrícula real (puede consumir `SpectatorCanvasService.snapshots()`)
- 2I.5 `TieBreakView` — falta destacar `state.tiedPlayers` y opción de mover voto si IMPOSTOR
- 2I.6 `VoteResultView` — falta revelar `state.eliminated` y `state.wasImpostorEliminated`

### 5.4 Decisiones técnicas de esta entrega

1. **Opción B (servicio dedicado) sobre A (en GameStateService)**: razón principal — mantener `GameStateService` puro y los 18 tests previos sin cambios. Detalle completo en [track-i-plan.md §4.6](./track-i-plan.md).
2. **`<img>` en lugar de `<canvas>` para miniaturas espectador**: el servicio mantiene canvas off-screen y emite dataURL en cada stroke. Coste ~mínimo para ≤8 jugadores y simplifica el binding (`<img [src]="snapshots()[id]">`). Si la carga de strokes crece mucho, fácil optimizar con throttle del `toDataURL` por stroke.
3. **Caja de adivinación inline en DrawingPhaseView (fallback impostor)**: en lugar de slot vacío hasta que P6 termine 2I.8. Marcada como PENDING en código y comentario en HTML para que P6 sepa que cuando entregue su overlay, hay que quitar este bloque inline.
4. **`myPlayerId` hardcoded a 42 en dev mode**: coincide con el guion del MockGameEventEmitter (el primer jugador del `drawingOrder`). Cuando Track E mergee, se decodifica del JWT.
5. **Mock de Canvas API por test, no global**: `vi.spyOn(HTMLCanvasElement.prototype, 'getContext')` solo en los specs que lo necesitan. No toco la config global de Vitest para no afectar al test preexistente roto del scaffold (responsabilidad de Track G).
6. **EndReason traducido en el componente, no en GameStateService**: es UI text, no estado. Mantiene el servicio data-only.
7. **Todos los componentes mantienen `data-testid="<phase>-phase"` en el root**: contrato con los tests del container, garantiza que el `@switch` sigue eligiendo el componente correcto sin importar cómo se reescriba el resto del DOM.

### 5.5 Cómo verificarlo

```bash
cd frontend
npm test         # 77 tests míos verdes
npm run build    # bundle producción OK
npm start        # ng serve en :4200
```

En `http://localhost:4200/room/TEST/game?dev=true` ahora se ven las 3 vistas reales (Drawing/Voting/GameOver) durante el guion automático del MockGameEventEmitter. Las miniaturas en VotingView salen como placeholder "(sin dibujo)" porque el mock no simula strokes — comportamiento esperado, marcado en docs.

---

## Apéndice — Cómo levantar todo localmente

```bash
# Backend
cd backend
./mvnw test                                        # 39 tests verdes
./mvnw -DskipTests spring-boot:run                  # arranca en :8080 (necesita Postgres + RabbitMQ)

# Stack completo (recomendado)
docker-compose up --build                           # backend + db + rabbitmq

# Frontend
cd frontend
npm install
npm start                                           # ng serve en :4200
# O en modo demo offline:
# abrir http://localhost:4200/room/TEST/game?dev=true
```
