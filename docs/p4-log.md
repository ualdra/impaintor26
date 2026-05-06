# P4

**Autor:** P4 (José Esteban)
**Fecha modificación:** 2026-05-06
**Cobertura:** Track D (Fase 1, completado), CI backend, stub temporal de `User`, plan de Track I (Fase 2).

---

## Índice

1. [Track D — Infraestructura en Tiempo Real (completado)](#1-track-d--infraestructura-en-tiempo-real-completado)
2. [CI backend (GitHub Actions)](#2-ci-backend-github-actions)
3. [Stub temporal de `User` (PENDING — Track A)](#3-stub-temporal-de-user-pending--track-a)
4. [Decisiones técnicas del plan de Track I (pendiente, compartido P3+P4)](#4-decisiones-técnicas-del-plan-de-track-i)
5. [Plan de implementación de Track I — fases](#5-plan-de-implementación-de-track-i--fases)
6. [Riesgos abiertos y mitigaciones](#6-riesgos-abiertos-y-mitigaciones)
7. [Checklist de coordinación cruzada](#7-checklist-de-coordinación-cruzada)

---

## 1. Track D — Infraestructura en Tiempo Real (completado)

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

### 1.3 SPIs / contratos para otros Tracks (con `// PENDING` documentado)

| SPI | Quién la cubrirá | Estado actual |
|---|---|---|
| `TokenValidator` | **Track A** | Impl real `JwtTokenValidator` con jjwt ya funcional. Track A solo necesita firmar tokens con el mismo secret de `impaintor.realtime.jwt.secret`. |
| `RoomMembershipChecker` | **Track B** | Stub `AlwaysAllowMembershipChecker` registrado vía `@Bean @ConditionalOnMissingBean`. Track B aporta su impl real y el stub se desactiva solo. |
| `RoomTopicRegistry` | **Track B** consumer | Implementado. Track B llama `register/unregister` al crear/destruir salas. |
| `RealtimePublisher` | **Track H** consumer | Implementado. Track H lo inyecta en su `GameService` y emite eventos. |
| `GameInputHandler` | **Track H** | Stub `LoggingGameInputHandler`. Track H aporta `GameService` que implementa esta interfaz. |

### 1.4 Decisiones de diseño relevantes

1. **Modo broker condicional vía properties** (no `@Profile`) — más explícito y testeable.
2. **DTOs sealed + records con discriminador `type` en JSON** — espejo del formato de la sec 6.2 de CLAUDE.md, validable por Jackson.
3. **Anti-spoofing en controllers**: el `playerId`/`voterId` siempre se lee del `Principal` autenticado, no del payload del cliente.
4. **`MessageHeaderAccessor.getAccessor` con mutación in-place** en `JwtChannelInterceptor` — única forma de que el `Principal` propague a la sesión WebSocket en frames SEND posteriores. Necesita `setLeaveMutable(true)` en los headers (Spring lo hace por defecto en producción; en los tests unitarios lo añadimos manualmente).
5. **`@ConditionalOnMissingBean` solo en `@Bean`** (no en `@Component` — no funciona ahí). Por eso los stubs son `@Bean` en `RealtimeStubsConfig`.
6. **Test de integración con `SimpleBroker` en lugar de Testcontainers RabbitMQ** — más rápido, no requiere Docker en CI, y verifica el wiring real de mappings + broadcast.

### 1.5 Cómo correrlo

```bash
# Tests
cd backend && ./mvnw test

# Build
./mvnw -DskipTests package

# Stack completo
docker-compose up --build
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

### 3.3 Qué hacer cuando Track A merge

**Borrar este archivo** y dejar que Track A aporte el suyo. Si Track A respeta los nombres de campos de CLAUDE.md sec 4.1 (lo está haciendo), el merge será trivial. Si renombran algún campo, hay que actualizar `Room.java` y `RoomController.java` (ambos son de Track B, no nuestros).

**Marca el archivo con un grep recordatorio:**

```bash
grep -r "STUB PROVISIONAL" backend/src/main/java
```

---

## 4. Riesgos abiertos y mitigaciones

| Riesgo | Mitigación | Estado |
|---|---|---|
| Track A renombra campos de `User` y rompe `Room`/`RoomController` | Stub usa nombres exactos de CLAUDE.md sec 4.1 | Mitigado |
| Track B/C/D editan `dev` con código que no compila (como pasó con `User`) | CI backend bloquea PRs hacia main que no compilen | Mitigado |
| Track H emite `GameEvent` con forma JSON ligeramente distinta | Yo (P4) controlo los DTOs backend en Track D y los espejos TypeScript en Track I — mismo formato garantizado | Mitigado |
| `@stomp/stompjs` rompe SSR | `/room/*` es Client-only + `isPlatformBrowser()` guard en el servicio | Plan |
| Vitest + TestBed compatibility en Angular 21 | Validar primero con un test trivial antes de la suite completa | Plan |
| 2I.8 (P6) no llega a tiempo | `DrawingPhaseView` tiene un fallback inline `<input>` para que el impostor pueda jugar igual | Plan |
| Conflicto de merge con Track F (`WebSocketService`) | Aislamos en `features/realtime/` para que F coja el archivo como base | Plan |

---

## 5. Checklist de coordinación cruzada

**Para cuando los demás tracks merge:**

- [ ] **Track A merge** → borrar `feature/user/models/User.java` (stub) y verificar que la `User` de Track A respeta los campos `id`, `email`, `username`, `password`, `elo`, `gamesPlayed`, `gamesWon`, `createdAt`. Si no, ajustar `Room.java`/`RoomController.java` (de Track B).
- [ ] **Track A merge** → confirmar que su `JwtTokenProvider` o equivalente firma con el secret de `impaintor.realtime.jwt.secret`. Si Track A trae su propio secret, unificar en `application.yml`.
- [ ] **Track A merge** → el `SecurityFilterChain` real de Track A desactivará `RealtimeSecurityConfig` automáticamente vía `@ConditionalOnMissingBean(SecurityFilterChain.class)`.
- [ ] **Track B merge** → su impl de `RoomMembershipChecker` desactivará `AlwaysAllowMembershipChecker` automáticamente vía `@ConditionalOnMissingBean(RoomMembershipChecker.class)`.
- [ ] **Track B merge** → asegurar que `RoomService.create()` invoque `RoomTopicRegistry.registerRoom(code)` y `RoomService.delete()` invoque `unregisterRoom(code)`.
- [ ] **Track H merge** → su `GameService` (o equivalente) implementará `GameInputHandler` y desactivará `LoggingGameInputHandler` vía `@ConditionalOnMissingBean(GameInputHandler.class)`. También inyectará `RealtimePublisher` para emitir eventos.
- [ ] **Track E merge (frontend)** → su `AuthService` reemplazará el helper directo `core/auth/token.ts`. Buscar imports de `getToken` y migrar a `AuthService.getToken()`.
- [ ] **Track F merge (frontend)** → su `WebSocketService` reemplazará nuestro `StompClientService` bajo `features/realtime/`. Cambiar imports en `GameComponent`.
- [ ] **P6 trabaja en 2I.8 / 2I.9** → enchufa su `ImpostorOverlay` en el slot `[impostorOverlay]` y subscribe `AudioService` a `gameEvents$` de `GameStateService`. Sin tocar nuestros componentes.

---

## Apéndice — Cómo levantar todo localmente

```bash
# Backend (en una terminal)
cd backend
./mvnw test                                        # 39 tests verdes
./mvnw -DskipTests spring-boot:run                  # arranca en :8080 (necesita Postgres + RabbitMQ)

# Stack completo (recomendado)
docker-compose up --build                           # backend + db + rabbitmq

# Frontend (cuando Track I esté implementado)
cd frontend
npm install
npm start                                           # ng serve en :4200
# O en modo demo offline:
# abrir http://localhost:4200/room/TEST/game?dev=true
```

Cualquier duda → ping a P4 (José Esteban).