# Impaintor — Especificación Formal y Plan de Desarrollo

## Índice

1. [Descripción General del Juego](#1-descripción-general)
2. [Mecánicas del Juego — Reglas Detalladas](#2-mecánicas-del-juego)
3. [Arquitectura y Stack Tecnológico](#3-arquitectura)
4. [Modelo de Datos](#4-modelo-de-datos)
5. [Endpoints de la REST API](#5-rest-api)
6. [Comunicación en Tiempo Real](#6-tiempo-real)
7. [Pipeline de Datos Externos (Palabras)](#7-pipeline-de-palabras)
8. [Vistas y Componentes del Frontend](#8-frontend)
9. [Infraestructura Docker](#9-docker)
10. [Fases de Desarrollo y Desglose de Tareas](#10-tareas)

---

## 1. Descripción General del Juego

**Impaintor** es un juego multijugador online de dibujo y engaño (3–8 jugadores). Al inicio de la partida, el servidor elige un grupo de 3 palabras relacionadas y selecciona una como la palabra secreta — **esta palabra se mantiene durante toda la partida**. Todos los jugadores excepto uno (el "impostor") reciben esa palabra para dibujar. El impostor no ve nada y debe inventarse sus dibujos. Desde el inicio de la partida, el impostor tiene acceso permanente a una pista (una de las 2 palabras restantes del grupo) y puede intentar adivinar la palabra en cualquier momento, pero con vidas limitadas (por defecto 1): si falla y se queda sin vidas, pierde instantáneamente. Los jugadores votan simultáneamente a quién creen que es el impostor. El juego continúa ronda tras ronda (nuevos dibujos de la misma palabra) hasta que el impostor es descubierto, adivina la palabra, o sobrevive hasta quedar solo con un pintor.

**Modos de juego:**

- **Personalizada/Privada:** Un jugador crea una sala con un código. De 3 a 8 jugadores. Tiempo de dibujo y vidas del impostor configurables.
- **Ranked (Reto del Profesor):** Emparejamiento automático con 5 jugadores. Basado en ELO, donde el rango de búsqueda se amplía ±100 cada 10 segundos.

---

## 2. Mecánicas del Juego — Reglas Detalladas

### 2.1 Preparación

1. Se crea una sala (por código para partidas privadas, o mediante matchmaking para ranked).
2. Mínimo 3 jugadores, máximo 8. Ranked siempre 5.
3. El creador de la sala puede configurar (solo en privadas):
   - Tiempo de dibujo por turno (por defecto: 30 segundos).
   - Vidas del impostor para adivinar (por defecto: 1).
4. Cuando el anfitrión inicia la partida, el servidor:
   - Selecciona un grupo de 3 palabras aleatorio de la base de datos.
   - Elige una de las 3 palabras como la palabra secreta. **Esta palabra se mantiene durante toda la partida.**
   - Selecciona 1 de las 2 palabras restantes como pista para el impostor (ver sección 2.4).
   - Asigna a un jugador aleatorio como impostor. **El impostor es el mismo durante toda la partida.**
   - Aleatoriza el orden de dibujo.
   - Envía a cada pintor la palabra secreta, y al impostor su rol junto con la pista.

### 2.2 Fase de Dibujo

1. Los jugadores dibujan secuencialmente en el orden aleatorizado.
2. Cada jugador tiene N segundos (por defecto 30) para dibujar en un canvas HTML5.
3. Los jugadores no impostores ven la palabra secreta encima de su canvas mientras dibujan. **La palabra es la misma en todas las rondas** — cada ronda produce nuevos dibujos de la misma palabra.
4. El impostor no ve la palabra secreta, pero **sí tiene acceso permanente a la pista y a la caja de adivinación** durante esta fase (ver sección 2.4).
5. Los datos de dibujo (coordenadas/trazos) se retransmiten en tiempo real a todos los jugadores a través del message broker, de modo que todos ven cada dibujo formarse en directo.
6. Después de que todos los jugadores hayan dibujado, todos los dibujos se muestran simultáneamente en una vista de galería.

### 2.3 Fase de Votación

1. Después de ver todos los dibujos, **todos los jugadores votan simultáneamente** a quién creen que es el impostor dentro de una ventana de tiempo.
2. **Regla especial de la ronda 1:** La votación es opcional. Los jugadores que no voten se cuentan automáticamente como votándose a sí mismos. Si hay empate o no hay mayoría clara, nadie es eliminado.
3. **Regla de la ronda 2 en adelante:** La votación es obligatoria. Los jugadores que no voten se cuentan automáticamente como votándose a sí mismos.
4. **Desempate — el impostor mueve su voto:** Si hay empate en la votación (ronda 2+), se abre una fase de desempate. El impostor **no recibe un voto extra** — puede **mover su voto ya emitido** a otro jugador para romper el empate. Esto es estratégico: el impostor tiene interés en eliminar pintores para acercarse a la victoria. Si el impostor **no mueve su voto** y el empate persiste, el impostor es expulsado automáticamente y los pintores ganan.
5. **Resultados semi-anónimos:** Solo se revelan los jugadores con el mayor número de votos. Ejemplo: si dos jugadores tienen 3 votos cada uno y el resto tiene 2, solo se muestran esos dos nombres. El resto queda oculto.
6. El jugador con más votos es eliminado de la partida. Si es el impostor, los pintores ganan.

### 2.4 Pistas y Mecánica de Adivinación del Impostor

**Sistema de pistas:** La partida utiliza un grupo de 3 palabras relacionadas. Una es la palabra secreta que los pintores deben dibujar. De las 2 restantes, el servidor selecciona 1 como pista y se la envía al impostor al inicio de la partida. Al ser palabras relacionadas pero nunca sinónimos, la pista ayuda al impostor a acotar el campo pero no le da la respuesta directa. **La pista y la palabra secreta son las mismas durante toda la partida.**

**Mecánica de adivinación:**

1. La caja de texto de adivinación y la pista son **permanentes y están disponibles en todo momento**: durante la fase de dibujo, la galería y la votación. El impostor puede intentar adivinar cuando quiera.
2. El impostor tiene un número limitado de **vidas** (por defecto: 1, configurable en partidas personalizadas).
3. Si el impostor acierta la palabra secreta → **el impostor gana**, la partida termina inmediatamente.
4. Si el impostor falla → **pierde una vida**. Si se queda sin vidas, la partida termina instantáneamente y **los pintores ganan**. Con el valor por defecto de 1 vida, un fallo significa derrota inmediata.
5. El impostor debe decidir estratégicamente cuándo usar su intento: adivinar pronto es arriesgado porque ha visto pocos dibujos, pero esperar demasiado rondas significa arriesgarse a ser descubierto por votación.

### 2.5 Condiciones de Fin de Partida

| Condición | Ganador |
|---|---|
| El impostor es eliminado por votación | Pintores |
| El impostor adivina la palabra correctamente | Impostor |
| El impostor falla un intento de adivinación y se queda sin vidas | Pintores |
| Empate en votación (ronda 2+) y el impostor no mueve su voto para romperlo | Pintores (impostor expulsado) |
| Solo quedan 2 jugadores (impostor + 1 pintor) y el impostor no ha sido descubierto | Impostor |

**Nota sobre la última condición:** Con la palabra fija y rondas infinitas, si el impostor sobrevive hasta quedar solo él y un pintor, la partida no puede continuar de forma significativa (un 1v1 donde el pintor siempre se votaría a sí mismo). Por tanto, el impostor gana automáticamente al llegar a esta situación.

### 2.6 Sistema de Puntuación (Pendiente de Definir)

El sistema de puntos es una tarea separada que debe diseñarse e implementarse. Debe contemplar:

- Puntos otorgados/restados según las condiciones de victoria/derrota anteriores.
- Bonificación por detección temprana del impostor.
- Puntos para el impostor por sobrevivir múltiples rondas.
- Ajustes de ELO en ranked según las valoraciones de los oponentes.
- Este sistema es necesario para el modo Ranked pero el juego base puede funcionar sin él.

---

## 3. Arquitectura y Stack Tecnológico

### 3.1 Vista General de Componentes

```
┌────────────┐     HTTP/WS      ┌──────────────┐    AMQP     ┌────────────┐
│   Angular   │ ◄──────────────► │  Spring Boot  │ ◄─────────► │  RabbitMQ  │
│  Frontend   │   REST + STOMP   │   Backend     │             │  Broker    │
└────────────┘                   └──────┬───────┘             └────────────┘
                                        │ JPA
                                        ▼
                                 ┌──────────────┐
                                 │  PostgreSQL   │
                                 │  Database     │
                                 └──────────────┘
```

**Cuatro contenedores Docker:**

1. **frontend** — Aplicación Angular servida por Nginx.
2. **backend** — Aplicación Spring Boot (REST API + endpoint WebSocket/STOMP + lógica de juego).
3. **rabbitmq** — RabbitMQ con el plugin STOMP activado.
4. **db** — PostgreSQL.

### 3.2 Por Qué RabbitMQ

El profesor recomendó RabbitMQ como message broker para la comunicación en tiempo real del juego. La arquitectura utiliza **STOMP sobre WebSocket** con RabbitMQ como broker de respaldo:

- Cuando se crea una sala de juego, se configura un **topic exchange** de RabbitMQ para esa sala (ej: `/topic/room.{roomCode}`).
- Los jugadores se conectan vía WebSocket (protocolo STOMP) y se suscriben al topic de la sala.
- Los trazos de dibujo, eventos del juego (cambios de turno, votos, eliminaciones) y el chat se publican en el topic.
- RabbitMQ gestiona el fan-out: cada suscriptor del topic recibe todos los mensajes.
- Spring Boot actúa como relay STOMP, reenviando las conexiones WebSocket a RabbitMQ.

**Sub-topics por sala:**

- `/topic/room.{code}.draw` — datos de trazos (coordenadas, color, grosor).
- `/topic/room.{code}.game` — eventos del juego (inicio/fin de turno, resultados de votación, eliminaciones, fin de partida).
- `/topic/room.{code}.chat` — chat de texto entre jugadores.
- `/user/queue/private.{code}` — mensajes privados por jugador (asignación de palabra, designación de impostor).

### 3.3 Sin RabbitMQ (Solo Referencia)

Si se eliminase RabbitMQ, el único cambio sería sustituir el `StompBrokerRelay` de Spring (que hace proxy hacia RabbitMQ) por el `SimpleBroker` integrado de Spring (en memoria). La superficie de la API WebSocket/STOMP para el frontend sería idéntica. La estructura de topics, el modelo de suscripción y el formato de mensajes no cambiarían. La desventaja: `SimpleBroker` no puede escalar más allá de una única instancia del servidor y no tiene persistencia de mensajes. Para la escala de este proyecto (un solo servidor, <8 usuarios concurrentes por sala), esto es funcionalmente irrelevante, pero dado que el profesor recomendó RabbitMQ y satisface de forma natural el requisito de Docker multi-contenedor, se mantiene.

---

## 4. Modelo de Datos

### 4.1 Entidades

**User**
| Campo | Tipo | Notas |
|---|---|---|
| id | Long (PK) | Auto-generado |
| email | String (unique) | Credencial de inicio de sesión |
| username | String (unique) | Nombre visible |
| password | String | Hash BCrypt |
| elo | Integer | Por defecto 1000. Usado para matchmaking en ranked |
| gamesPlayed | Integer | Estadísticas |
| gamesWon | Integer | Estadísticas |
| createdAt | Timestamp | |

**WordGroup**
| Campo | Tipo | Notas |
|---|---|---|
| id | Long (PK) | |
| word1 | String | |
| word2 | String | |
| word3 | String | |
| source | String | "scraped", "api" o "manual" |
| language | String | "es" o "en" |

**GameRecord** (se persiste al terminar la partida)
| Campo | Tipo | Notas |
|---|---|---|
| id | Long (PK) | |
| roomCode | String | |
| mode | Enum | CUSTOM, RANKED |
| wordGroupId | Long (FK) | Qué grupo de palabras se usó |
| secretWord | String | Cuál de las 3 palabras fue la secreta |
| hintWord | String | Cuál de las 2 restantes se usó como pista |
| impostorId | Long (FK → User) | |
| winningSide | Enum | PAINTERS, IMPOSTOR |
| endCondition | Enum | VOTED_OUT, WORD_GUESSED, OUT_OF_LIVES, TIE_NOT_BROKEN, LAST_STANDING |
| rounds | Integer | Cuántas rondas se jugaron |
| playedAt | Timestamp | |

**GamePlayerRecord** (estadísticas por jugador de una partida finalizada)
| Campo | Tipo | Notas |
|---|---|---|
| id | Long (PK) | |
| gameRecordId | Long (FK) | |
| userId | Long (FK) | |
| wasImpostor | Boolean | Se muestra como "Impaintor" o "Paintor" en el historial |
| won | Boolean | Victoria o derrota para este jugador |
| eliminatedInRound | Integer (nullable) | null si sobrevivió |
| pointsEarned | Integer | |
| eloBefore | Integer | |
| eloAfter | Integer | El cambio de ELO se deriva como `eloAfter - eloBefore` |

**Vista de historial de partidas en el perfil:** Cada fila del historial muestra los datos de un `GamePlayerRecord` junto con el `playedAt` de su `GameRecord`: `[Fecha — "Paintor"/"Impaintor" — W/L — +15 ELO / -12 ELO]`. Es una lista scrollable, no una vista detallada de cada ronda.

**Nota sobre el estado del juego en memoria:** La sala de juego activa (ronda actual, orden de dibujo, votos, jugadores vivos, datos del canvas) vive enteramente en memoria en el backend, gestionada por un `GameService`. Solo el resultado final se persiste en la base de datos. Esto evita escrituras constantes a la BD durante una partida rápida y es apropiado dada la arquitectura de servidor único.

### 4.2 Relaciones entre Entidades

```
User 1──────────N GamePlayerRecord N──────────1 GameRecord
                                                    │
                                                    N
                                                    │
                                               WordGroup
```

---

## 5. Endpoints de la REST API

Estos endpoints satisfacen el requisito obligatorio de operaciones tanto de lectura (GET) como de escritura (POST/PUT/DELETE).

### 5.1 Auth

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Crear cuenta (email, username, password) |
| POST | `/api/auth/login` | Iniciar sesión, devuelve token JWT |

### 5.2 Users

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/users/me` | Obtener perfil del usuario actual |
| PUT | `/api/users/me` | Actualizar nombre de usuario o contraseña |
| GET | `/api/users/{id}` | Obtener perfil público (username, elo, estadísticas) |
| GET | `/api/users/leaderboard` | Top 50–100 usuarios por ELO |
| DELETE | `/api/users/me` | Eliminar cuenta propia |

### 5.3 Rooms

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/rooms` | Crear sala privada (devuelve código de sala) |
| GET | `/api/rooms/{code}` | Obtener información de la sala (jugadores, configuración, estado) |
| POST | `/api/rooms/{code}/join` | Unirse a una sala |
| POST | `/api/rooms/{code}/leave` | Salir de una sala |
| PUT | `/api/rooms/{code}/settings` | Actualizar configuración de la sala (solo anfitrión) |
| POST | `/api/rooms/{code}/start` | Iniciar la partida (solo anfitrión) |

### 5.4 Matchmaking (Ranked)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/matchmaking/queue` | Entrar en la cola de ranked |
| DELETE | `/api/matchmaking/queue` | Salir de la cola de ranked |
| GET | `/api/matchmaking/status` | Consultar estado de la cola |

### 5.5 Historial de Partidas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/games` | Listar historial de partidas del usuario actual (paginado). Cada entrada devuelve: fecha, rol (Paintor/Impaintor), resultado (W/L), cambio de ELO |
| GET | `/api/games/{id}` | Obtener detalles completos de una partida y resultados por jugador |

### 5.6 Word Groups (Admin/Dev)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/words` | Listar grupos de palabras (paginado) |
| POST | `/api/words` | Añadir un grupo de palabras manualmente |
| DELETE | `/api/words/{id}` | Eliminar un grupo de palabras |
| POST | `/api/words/generate` | Ejecutar el pipeline de scraping + API para generar nuevos grupos |

---

## 6. Comunicación en Tiempo Real (WebSocket/STOMP + RabbitMQ)

### 6.1 Flujo de Conexión

1. Tras unirse a una sala, el cliente Angular abre una conexión WebSocket a `ws://backend:8080/ws` usando la librería `@stomp/stompjs`.
2. El cliente se suscribe a los topics de la sala:
   - `/topic/room.{code}.draw` — para ver los dibujos.
   - `/topic/room.{code}.game` — para los eventos del estado del juego.
   - `/user/queue/private` — para datos privados (asignación de rol, palabra o pista según rol).
3. Spring Boot retransmite estas suscripciones a RabbitMQ a través de `StompBrokerRelay`.

### 6.2 Tipos de Mensajes

**Trazo de dibujo** (enviado por el jugador que dibuja → `/app/room.{code}.draw`):
```json
{
  "type": "STROKE",
  "playerId": 42,
  "points": [{"x": 120, "y": 80}, {"x": 122, "y": 83}],
  "color": "#FF0000",
  "thickness": 3
}
```

**Borrar canvas** (enviado por el jugador que dibuja):
```json
{
  "type": "CLEAR",
  "playerId": 42
}
```

**Eventos del juego** (enviados por el servidor → `/topic/room.{code}.game`):
```json
{ "type": "GAME_START", "drawingOrder": [5, 42, 17, 8], "round": 1 }
{ "type": "TURN_START", "playerId": 5, "timeSeconds": 30 }
{ "type": "TURN_END", "playerId": 5 }
{ "type": "GALLERY_PHASE" }
{ "type": "VOTE_PHASE", "timeSeconds": 30 }
{ "type": "VOTE_RESULT", "eliminated": 17, "wasImpostor": false, "topVoted": [{"id":17,"votes":3}] }
{ "type": "VOTE_TIE", "tiedPlayers": [{"id":17,"votes":3}, {"id":8,"votes":3}], "timeSeconds": 15 }
{ "type": "GUESS_ATTEMPT", "livesRemaining": 0, "correct": false }
{ "type": "NEW_ROUND", "round": 2, "drawingOrder": [5, 42, 8] }
{ "type": "GAME_OVER", "winner": "PAINTERS", "reason": "VOTED_OUT", "impostorId": 8, "secretWord": "guitarra" }
```

**Nota sobre VOTE_TIE:** Se emite cuando hay empate en la votación (ronda 2+). El impostor tiene `timeSeconds` para mover su voto a otro jugador y romper el empate. Si no lo hace, se emite un `GAME_OVER` con `reason: "TIE_NOT_BROKEN"`. **NEW_ROUND** indica que una nueva ronda comienza — la palabra secreta sigue siendo la misma, pero se producirán nuevos dibujos.

**Mensajes privados** (enviados por el servidor → `/user/queue/private`):
```json
{ "type": "ROLE_ASSIGNMENT", "role": "PAINTER", "word": "guitarra" }
{ "type": "ROLE_ASSIGNMENT", "role": "IMPOSTOR", "hint": "piano", "lives": 1 }
{ "type": "GUESS_RESULT", "correct": false, "livesRemaining": 0 }
```

**Flujo de mensajes privados:**
- Al inicio de la partida (una sola vez): cada pintor recibe `ROLE_ASSIGNMENT` con su rol y la palabra secreta. El impostor recibe `ROLE_ASSIGNMENT` con su rol, la pista y el número de vidas. No se envían más asignaciones durante la partida — la palabra y la pista no cambian.
- Cuando el impostor intenta adivinar: recibe `GUESS_RESULT` con el resultado. Si `correct: true`, se emite `GAME_OVER` a todos. Si `correct: false` y `livesRemaining: 0`, también se emite `GAME_OVER`.

### 6.3 Game Controller en el Servidor

El `GameWebSocketController` de Spring Boot usa `@MessageMapping` para recibir mensajes del cliente y `SimpMessagingTemplate` para enviar eventos del juego. Toda la lógica del juego (gestión de turnos, recuento de votos, eliminación, condiciones de victoria) se ejecuta en `GameService` en el lado del servidor. El cliente nunca decide el estado del juego — solo envía acciones (trazos de dibujo, emitir voto, enviar intento de adivinación) y renderiza lo que el servidor le indica.

---

## 7. Pipeline de Datos Externos — Generación de Grupos de Palabras

Este pipeline satisface dos requisitos obligatorios: **API externa** y **web scraping**.

### 7.1 Fase 1 — Scraping de Palabras Semilla

Un `@Service` de Spring Boot o un script independiente hace scraping de listas de palabras dibujables/sustantivos comunes de fuentes web públicas. Fuentes objetivo (elegir al menos una):

- Sitios de listas de palabras para Pictionary.
- Listas de frecuencia de Wiktionary.
- Cualquier sitio público con listas de sustantivos categorizados.

El scraper extrae palabras individuales, filtra por sustantivos dibujables (sin conceptos abstractos) y las almacena como palabras semilla en una lista temporal.

**Implementación:** Usar Jsoup (parser HTML para Java, habitual en proyectos Spring Boot) para el scraping.

### 7.2 Fase 2 — Enriquecimiento con la API de Datamuse

Para cada palabra semilla, se llama a la **API de Datamuse** (gratuita, sin autenticación):

- `GET https://api.datamuse.com/words?rel_trg={seed}` — palabras asociadas/trigger.
- `GET https://api.datamuse.com/words?ml={seed}` — palabras con significado similar.

De los resultados, se seleccionan 2 palabras relacionadas que:
- No sean sinónimos de la semilla (filtrar los resultados de `rel_syn`).
- Sean concretas/dibujables (filtrar comprobando la etiqueta gramatical si está disponible, o cruzando con las listas de palabras del scraping).

### 7.3 Fase 3 — Agrupación y Almacenamiento

El algoritmo forma grupos de 3 (semilla + 2 palabras relacionadas), valida que sean suficientemente distintas entre sí, y las inserta en la tabla `WordGroup` con `source = "api"`.

Los grupos de palabras manuales también se pueden añadir a través de la REST API (`source = "manual"`) como respaldo y para complementar los generados automáticamente.

### 7.4 Rate Limiting

Datamuse no tiene un límite de tasa estricto pero las peticiones deben limitarse (1 por segundo) durante la generación por lotes. El pipeline se ejecuta bajo demanda (a través del endpoint `/api/words/generate`) o como tarea de inicio, nunca durante las partidas.

---

## 8. Vistas y Componentes del Frontend

### 8.1 Mapa de Vistas

```
/login                  → LoginComponent
/register               → RegisterComponent
/home                   → HomeComponent (menú principal)
/profile                → ProfileComponent (estadísticas, elo, historial de partidas + clasificación)
/profile/:id            → PublicProfileComponent
/leaderboard            → LeaderboardComponent
/room/create            → CreateRoomComponent
/room/:code/lobby       → LobbyComponent (sala de espera, configuración, lista de jugadores)
/room/:code/game        → GameComponent (vista principal del juego, descrita abajo)
/matchmaking            → MatchmakingComponent (cola ranked, animación de búsqueda)
```

### 8.2 GameComponent — Sub-vistas

La ruta `/room/:code/game` contiene una vista dirigida por estados que alterna entre fases:

1. **DrawingPhaseView:** Muestra el canvas (activo si es tu turno, modo espectador si no). Cuenta atrás del temporizador. Muestra la palabra para los pintores (o la pista + caja de adivinación para el impostor). Renderizado en tiempo real de los trazos del dibujante actual.
2. **GalleryView:** Cuadrícula con todos los canvas de los jugadores de la ronda. Se muestra después de que todos hayan dibujado. La caja de adivinación del impostor sigue visible.
3. **VotingView:** Tarjetas de jugadores con sus canvas. **Todos votan simultáneamente.** Cuenta atrás del temporizador. La caja de adivinación del impostor sigue visible.
4. **TieBreakView:** (Solo ronda 2+) Se muestra cuando hay empate. Los jugadores empatados se destacan. El impostor puede mover su voto a otro jugador para romper el empate. Cuenta atrás. Si no lo hace, el impostor es expulsado.
5. **VoteResultView:** Muestra quién fue eliminado (o nadie en ronda 1). Revela si era el impostor.
6. **GameOverView:** Anuncio del ganador, estadísticas finales, revelación de la palabra secreta, enlace para jugar de nuevo.

La pista y la caja de texto de adivinación del impostor son un elemento flotante persistente visible en **todas** las sub-vistas (excepto GameOverView). Muestra la pista, la caja de texto, el botón de enviar y las vidas restantes. Solo visible para el impostor.

### 8.3 Componente Canvas

- Elemento HTML5 `<canvas>`.
- Listeners de eventos de ratón/táctil que capturan los trazos de dibujo.
- Los trazos se agrupan por lotes (cada ~50ms) y se envían al broker STOMP.
- Los trazos entrantes de otros jugadores se renderizan en una instancia de canvas de solo lectura.
- Herramientas: color del pincel (paleta limitada), grosor del pincel (3 tamaños), goma de borrar, borrar canvas.
- Sin herramienta de texto (evita escribir la palabra directamente).

### 8.4 Patrón Master-Detail (Requisito de Angular)

El patrón master-detail es requisito del stack tecnológico. Se aplica de forma natural a:

- **Historial de partidas en el perfil** → Lista scrollable `[Fecha — Paintor/Impaintor — W/L — +/-ELO]`. No requiere vista de detalle (datos suficientes en la propia fila).
- **Clasificación (leaderboard)** → Top 50–100 jugadores por ELO. Clic en fila → vista detalle de perfil público. (Master-detail).
- **Lista de jugadores de la sala** → Vista detalle de perfil del jugador.
- **Lista de grupos de palabras** (admin) → Vista de detalle/edición del grupo.

---

## 9. Infraestructura Docker

### 9.1 Estructura del docker-compose.yml

```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "4200:80"
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/impaintor
      - SPRING_DATASOURCE_USERNAME=impaintor
      - SPRING_DATASOURCE_PASSWORD=impaintor
      - SPRING_RABBITMQ_HOST=rabbitmq
    depends_on:
      db:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  db:
    image: postgres:16
    environment:
      - POSTGRES_DB=impaintor
      - POSTGRES_USER=impaintor
      - POSTGRES_PASSWORD=impaintor
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U impaintor"]
      interval: 5s
      timeout: 3s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "15672:15672"   # UI de gestión (solo desarrollo)
    environment:
      - RABBITMQ_DEFAULT_USER=impaintor
      - RABBITMQ_DEFAULT_PASS=impaintor
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_running"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### 9.2 Dockerfiles

**Frontend (Angular):** Build multi-stage. Etapa 1: `node:20` ejecuta `ng build --configuration production`. Etapa 2: `nginx:alpine` sirve los archivos estáticos generados con un `nginx.conf` personalizado que redirige las peticiones `/api` y `/ws` al backend.

**Backend (Spring Boot):** Build multi-stage. Etapa 1: `maven:3.9-eclipse-temurin-21` ejecuta `mvn package -DskipTests`. Etapa 2: `eclipse-temurin:21-jre-alpine` ejecuta el JAR.

---

## 10. Fases de Desarrollo y Desglose de Tareas

El proyecto se divide en 4 fases. Las tareas dentro de cada fase están diseñadas para ser trabajadas **en paralelo por diferentes personas/parejas** con conflictos de merge mínimos. Cada tarea está etiquetada con un tamaño de equipo sugerido y una lista de dependencias.

### Fase 0 — Scaffolding del Proyecto (Todos, 1 sesión)

Los 7 miembros presentes. Montar el esqueleto del proyecto para que todo el trabajo futuro tenga una base sobre la que construir.

| # | Tarea | Quién | Depende de |
|---|---|---|---|
| 0.1 | Crear repositorio GitHub con branch protection y reglas de PR review | 1 persona | — |
| 0.2 | Inicializar proyecto Spring Boot (Maven, Java 21, dependencias: Spring Web, Spring Data JPA, Spring Security, Spring WebSocket, Spring AMQP, driver PostgreSQL, Jsoup, Lombok) | 1 persona | 0.1 |
| 0.3 | Inicializar proyecto Angular (`ng new`, instalar `@stomp/stompjs`, configurar routing module, proxy config para desarrollo) | 1 persona | 0.1 |
| 0.4 | Escribir `docker-compose.yml` + todos los Dockerfiles (frontend, backend, postgres, rabbitmq) — verificar que todo arranca con `docker-compose up` | 1–2 personas | 0.2, 0.3 |
| 0.5 | Configurar RabbitMQ con el plugin STOMP activado, verificar conexión desde Spring Boot | 1 persona | 0.4 |
| 0.6 | Crear esquema de base de datos (migración SQL o entidades JPA con `ddl-auto=update` por ahora) | 1 persona | 0.2 |
| 0.7 | Configurar canal de Discord/comunicación, acordar estrategia de ramas en Git (feature branches + PR reviews) | Todos | — |

**Entregable:** Ejecutar `docker-compose up` arranca los 4 contenedores. El backend conecta con la BD y RabbitMQ. El frontend carga en el navegador y puede hacer proxy de peticiones al backend. Base de datos vacía con el esquema correcto.

---

### Fase 1 — Funcionalidades Core en Paralelo (3–4 semanas)

Siete tracks independientes. Cada persona/pareja elige uno. Los tracks A–D son de backend, E–G son de frontend. Dependencias cruzadas mínimas.

#### Track A — Autenticación y Gestión de Usuarios
**Sugerido:** 1 persona

| # | Tarea | Descripción |
|---|---|---|
| 1A.1 | Entidad User + repository | Entidad JPA, repository de Spring Data, migración de BD |
| 1A.2 | Endpoint de registro | `POST /api/auth/register` — validar unicidad del email, hashear contraseña con BCrypt, devolver usuario creado |
| 1A.3 | Endpoint de login + JWT | `POST /api/auth/login` — verificar credenciales, generar JWT. Añadir `JwtFilter` a la cadena de filtros de Spring Security |
| 1A.4 | Endpoints de perfil de usuario | `GET/PUT/DELETE /api/users/me`, `GET /api/users/{id}` |
| 1A.5 | Endpoint de clasificación | `GET /api/users/leaderboard` — paginado, ordenado por ELO descendente |

#### Track B — Gestión de Salas (REST)
**Sugerido:** 1 persona

| # | Tarea | Descripción |
|---|---|---|
| 1B.1 | Modelo de Room en memoria | Clase Java: `Room` con código de sala, anfitrión, lista de jugadores, configuración, estado (WAITING / IN_GAME / FINISHED) |
| 1B.2 | Endpoint de crear sala | `POST /api/rooms` — genera código único de 6 caracteres, crea objeto Room en memoria, devuelve el código |
| 1B.3 | Endpoints de unirse/salir | `POST /api/rooms/{code}/join` y `/leave` — añadir/quitar jugador de la sala, emitir actualización por STOMP |
| 1B.4 | Endpoint de info de sala | `GET /api/rooms/{code}` — devuelve jugadores, configuración, estado |
| 1B.5 | Endpoint de configuración de sala | `PUT /api/rooms/{code}/settings` — el anfitrión configura tiempo de dibujo, vidas del impostor |
| 1B.6 | Trigger de inicio de partida | `POST /api/rooms/{code}/start` — valida número de jugadores, transiciona a IN_GAME, señaliza al GameService |

#### Track C — Sistema de Palabras y Pipeline de Datos Externos
**Sugerido:** 1 persona

| # | Tarea | Descripción |
|---|---|---|
| 1C.1 | Entidad WordGroup + repository | Entidad JPA, repository, datos semilla (20–30 grupos de palabras manuales para testing inmediato) |
| 1C.2 | Endpoints CRUD de grupos de palabras | `GET /api/words`, `POST /api/words`, `DELETE /api/words/{id}` |
| 1C.3 | Servicio de web scraping | Scraper basado en Jsoup que extrae palabras dibujables de un sitio público de listas de palabras. Almacena las palabras semilla |
| 1C.4 | Integración con la API de Datamuse | Servicio que llama a Datamuse por cada palabra semilla, obtiene palabras relacionadas, aplica filtrado |
| 1C.5 | Algoritmo de agrupación | Toma las palabras semilla + resultados de la API, forma grupos válidos de 3 (relacionadas pero no sinónimos, todas dibujables), almacena como WordGroup |
| 1C.6 | Endpoint de generación | `POST /api/words/generate` — ejecuta el pipeline completo (scraping → API → agrupación → almacenamiento) |

#### Track D — Infraestructura en Tiempo Real (WebSocket/STOMP/RabbitMQ)
**Sugerido:** 1 persona

| # | Tarea | Descripción |
|---|---|---|
| 1D.1 | Configuración WebSocket/STOMP | `WebSocketMessageBrokerConfigurer` de Spring con `StompBrokerRelay` apuntando a RabbitMQ. Endpoint STOMP en `/ws` |
| 1D.2 | Autenticación en WebSocket | Validación de JWT en el frame STOMP CONNECT. Asociar sesión con usuario autenticado |
| 1D.3 | Gestión de topics de sala | Al crear una sala, configurar topic exchange. Al destruirla, limpiar. Los jugadores se suscriben/desuscriben al unirse/salir |
| 1D.4 | Retransmisión de mensajes de dibujo | Handler con `@MessageMapping` que recibe datos de trazos del jugador que dibuja y los retransmite a `/topic/room.{code}.draw` |
| 1D.5 | Difusión de eventos del juego | Métodos de `SimpMessagingTemplate` para enviar eventos del juego a `/topic/room.{code}.game` |
| 1D.6 | Entrega de mensajes privados | Enviar asignaciones de rol al inicio de la partida (una sola vez): pintores reciben ROLE_ASSIGNMENT con la palabra secreta, impostor recibe ROLE_ASSIGNMENT con la pista y vidas. Entrega vía `/user/queue/private` |

#### Track E — Frontend: Auth, Home y Navegación
**Sugerido:** 1 persona

| # | Tarea | Descripción |
|---|---|---|
| 1E.1 | Auth service + HTTP interceptor | Servicio Angular para login/registro. JWT almacenado en localStorage. HTTP interceptor añade cabecera `Authorization` |
| 1E.2 | Páginas de Login y Registro | Formularios con validación. Redirección a home al completarse |
| 1E.3 | Página Home | Menú principal: Crear Sala, Unirse a Sala (input de código), Jugar Ranked, Perfil, Clasificación |
| 1E.4 | Navegación y route guards | Navbar, `AuthGuard` para rutas protegidas, redirigir usuarios no autenticados a login |
| 1E.5 | Página de Perfil | Mostrar estadísticas del usuario (partidas jugadas, ganadas, ELO). Editar nombre/contraseña. Dos paneles lado a lado: (1) lista scrollable de historial de partidas con formato `[Fecha — Paintor/Impaintor — W/L — +/-ELO]` usando `GET /api/games`; (2) clasificación top 50–100 por ELO usando `GET /api/users/leaderboard`. Solo visible para usuarios autenticados |
| 1E.6 | Página de Clasificación | Tabla paginada de los top 50–100 jugadores por ELO. Clic en fila → vista detalle de perfil público. (Master-detail). También accesible como componente reutilizable dentro del perfil |

#### Track F — Frontend: Lobby y UI de Sala
**Sugerido:** 1 persona

| # | Tarea | Descripción |
|---|---|---|
| 1F.1 | Página de Crear Sala | Formulario para configuración de sala (tiempo de dibujo, vidas del impostor). Llama a `POST /api/rooms`. Navega al lobby |
| 1F.2 | Flujo de Unirse a Sala | Introducir código de sala → `POST /api/rooms/{code}/join` → navegar al lobby |
| 1F.3 | Página de Lobby | Lista de jugadores en tiempo real (vía suscripción STOMP). Visualización de configuración. El anfitrión tiene botón "Iniciar Partida". Código de sala visible para compartir |
| 1F.4 | Servicio WebSocket | Servicio Angular que envuelve `@stomp/stompjs`. Conectar, desconectar, suscribirse, enviar. Lógica de reconexión |
| 1F.5 | Conexión a topics de sala | Al entrar en el lobby, conectar WebSocket y suscribirse a los topics de la sala. Gestionar eventos de jugador que se une/sale |

#### Track G — Frontend: Canvas y Componente de Dibujo
**Sugerido:** 1 persona

| # | Tarea | Descripción |
|---|---|---|
| 1G.1 | Componente canvas (dibujo local) | Canvas HTML5 con eventos de ratón/táctil. Paleta de colores, selector de grosor, goma de borrar, botón de borrar. Sin herramienta de texto |
| 1G.2 | Captura y agrupación de trazos | Capturar puntos cada ~50ms, agrupar en segmentos de trazo, emitir vía un Observable |
| 1G.3 | Envío de trazos por STOMP | Suscribirse al Observable del canvas, enviar mensajes de trazos a `/app/room.{code}.draw` |
| 1G.4 | Renderizado de canvas remoto | Recibir mensajes de trazos desde `/topic/room.{code}.draw`, renderizar en una instancia de canvas de solo lectura |
| 1G.5 | Gestión del estado del canvas | Guardar canvas como imagen (data URL) para la vista de galería. Limpiar canvas entre turnos |

---

### Fase 2 — Lógica del Juego e Integración (2–3 semanas)

Esta fase construye el bucle principal del juego. Requiere que los tracks B, D y G de la Fase 1 estén funcionales. Menos tracks en paralelo — se necesita colaboración más estrecha.

#### Track H — Motor del Juego en el Backend
**Sugerido:** 2 personas (pair programming recomendado)

| # | Tarea | Descripción |
|---|---|---|
| 2H.1 | Modelo de GameState | Clase en memoria: ronda actual, fase (DRAWING/GALLERY/VOTING/TIE_BREAK/RESULT), orden de dibujo, jugadores vivos, votos, ID del impostor, grupo de palabras de la partida, palabra secreta, pista, vidas restantes del impostor |
| 2H.2 | Inicialización del juego | Al iniciar partida: seleccionar grupo de palabras, elegir palabra secreta y pista (1 de las 2 restantes), asignar impostor, aleatorizar orden de dibujo, enviar asignaciones de rol privadas (pintores reciben la palabra, impostor recibe la pista y sus vidas). Todo se asigna una sola vez — la palabra no cambia entre rondas |
| 2H.3 | Gestión de turnos | Turnos secuenciales controlados por temporizador. Notificar al dibujante actual, difundir inicio/fin de turno. Gestionar timeout (avance automático) |
| 2H.4 | Fase de galería | Después de todos los turnos: transicionar a galería, difundir todas las capturas de canvas, establecer temporizador para votación |
| 2H.5 | Lógica de votación | Recoger votos simultáneos de todos los jugadores dentro de la ventana de tiempo. Aplicar reglas por ronda (R1 opcional/auto-voto, R2+ obligatorio/auto-voto). Si hay empate en R2+: emitir evento VOTE_TIE, dar al impostor una ventana para mover su voto. Si el impostor no mueve su voto → expulsión automática. Calcular resultado final, difundir |
| 2H.6 | Eliminación y ciclo de rondas | Eliminar al jugador eliminado, comprobar condiciones de victoria, iniciar siguiente ronda o terminar partida |
| 2H.7 | Gestión de adivinación del impostor | Recibir intento de adivinación **en cualquier momento** de la partida. Comprobar contra la palabra secreta. Si acierta → impostor gana. Si falla → restar una vida. Si vidas llegan a 0 → pintores ganan inmediatamente. Difundir resultado del intento a todos |
| 2H.8 | Desempate y expulsión del impostor | Implementar la fase de desempate: cuando hay empate en ronda 2+, emitir VOTE_TIE, dar al impostor una ventana de tiempo para mover su voto. Si el impostor no actúa, expulsarlo automáticamente (GAME_OVER con reason TIE_NOT_BROKEN) |
| 2H.9 | Fin de partida y persistencia | Al terminar la partida: crear registros GameRecord + GamePlayerRecord en la base de datos. Limpiar estado de la sala |

#### Track I — Flujo del Juego en el Frontend
**Sugerido:** 2 personas

| # | Tarea | Descripción |
|---|---|---|
| 2I.1 | Máquina de estados del GameComponent | `GameComponent` padre que escucha `/topic/room.{code}.game` y alterna entre sub-vistas según la fase del juego |
| 2I.2 | Vista de fase de dibujo | Canvas activo (si es tu turno) o canvas en modo espectador (si no). Barra de temporizador. Muestra la palabra para pintores. Para el impostor: muestra la pista y la caja de adivinación (elemento flotante persistente) |
| 2I.3 | Vista de galería | Cuadrícula de todos los canvas de los jugadores. Transición a votación por temporizador o botón |
| 2I.4 | Vista de votación | Tarjetas de jugadores con miniaturas del canvas. **Votación simultánea**: todos votan a la vez dentro de la ventana de tiempo. Temporizador. Caja de adivinación del impostor sigue visible |
| 2I.5 | Vista de desempate | (Solo ronda 2+) Se muestra cuando hay empate. Destacar jugadores empatados. El impostor ve la opción de mover su voto a otro jugador. Cuenta atrás. Si el tiempo se agota sin acción del impostor → transición a fin de partida |
| 2I.6 | Vista de resultado de votación | Mostrar jugador eliminado (o nadie en ronda 1). Revelar si era impostor. Transición a siguiente ronda o fin de partida |
| 2I.7 | Vista de fin de partida | Anuncio del ganador, revelación de la palabra secreta y la pista, revelación del impostor, número de rondas, botón de jugar de nuevo |
| 2I.8 | UI de adivinación del impostor | Elemento flotante persistente visible en **todas las fases del juego** (dibujo, galería, votación, desempate). Muestra: pista, caja de texto, botón de enviar, vidas restantes. Solo visible para el impostor. La pista se recibe una sola vez al inicio de la partida vía `ROLE_ASSIGNMENT` |
| 2I.9 | Efectos de sonido y feedback visual | Transiciones de turno, revelación de votos, eliminación, desempate, fin de partida. Opcional pero mejora significativamente la UX |

---

### Fase 3 — Modo Ranked, Pulido y Documentación (2 semanas)

#### Track J — Matchmaking Ranked (Reto del Profesor)
**Sugerido:** 1–2 personas

| # | Tarea | Descripción |
|---|---|---|
| 3J.1 | Servicio de cola de matchmaking | Cola en memoria de jugadores esperando partida ranked. Cada entrada almacena ID de usuario, ELO y timestamp de entrada a la cola |
| 3J.2 | Expansión del rango de ELO | Cada 10 segundos, ampliar búsqueda ±100 desde el ELO del jugador. Emparejar 5 jugadores dentro de rangos solapados |
| 3J.3 | Creación del match | Cuando se encuentran 5 jugadores compatibles, sacarlos de la cola, crear una sala ranked, notificar a los 5 vía WebSocket |
| 3J.4 | Frontend de matchmaking | Botón "Buscar Partida Ranked" en la página de inicio. Animación de búsqueda con visualización del rango de ELO expandiéndose. Botón de cancelar |
| 3J.5 | Diseño del sistema de puntuación | Definir las reglas completas de puntuación (ver sección 2.6). Implementar cálculo de puntos en GameService. Actualizar ELO tras partidas ranked |

#### Track K — Pulido, Documentación y Despliegue
**Sugerido:** Distribuido entre el equipo

| # | Tarea | Descripción |
|---|---|---|
| 3K.1 | Estilo visual personalizado | Esquema de colores consistente, temática apropiada para el juego (estilo de dibujo/arte), layout responsive |
| 3K.2 | Documentación Swagger/OpenAPI | Añadir `springdoc-openapi` al backend. Anotar todos los controllers. Verificar la documentación generada |
| 3K.3 | Documentación del modelo de datos | Diagrama E-R (se puede usar una herramienta o dibujar manualmente). Breve descripción de cada entidad y relación |
| 3K.4 | Perfil completo y historial | Integrar en el perfil los dos paneles: historial de partidas scrollable `[Fecha — Paintor/Impaintor — W/L — +/-ELO]` y clasificación top 50–100 por ELO lado a lado. Asegurar que la clasificación funciona como master-detail (clic → perfil público) |
| 3K.5 | Gestión de errores y casos límite | Desconexión a mitad de partida (periodo de gracia), recuperación al refrescar el navegador, códigos de sala inválidos, salas llenas |
| 3K.6 | Despliegue en la nube (bonus) | Desplegar docker-compose en un proveedor cloud (Railway, Render, o un VPS barato). Configurar dominio si es posible |
| 3K.7 | Pasada de calidad de código | Nombrado consistente, eliminar código muerto, añadir comentarios en lógica compleja, asegurar que todos los PRs estén revisados |

---

## Apéndice: Asignación Sugerida del Equipo (7 personas)

Esta es una posible distribución. Ajustar según las habilidades y preferencias de cada miembro.

| Persona | Track Fase 1 | Rol Fase 2 | Rol Fase 3 |
|---|---|---|---|
| P1 | A — Auth y Usuarios | H — Motor del juego (pareja) | K — Documentación/Pulido |
| P2 | B — Gestión de Salas | H — Motor del juego (pareja) | J — Matchmaking |
| P3 | C — Pipeline de Palabras | I — Flujo del juego (pareja) | J — Matchmaking |
| P4 | D — Infra Tiempo Real | I — Flujo del juego (pareja) | K — Despliegue |
| P5 | E — Frontend Auth/Nav | I — Soporte/testing | K — Estilo visual |
| P6 | F — Frontend Lobby | 2I.8 + 2I.9 — UI Impostor + SFX | K — Gestión de errores |
| P7 | G — Componente Canvas | H — Soporte/testing | K — Calidad de código |

Cada persona posee un área diferenciada en la Fase 1, lo que significa conflictos de git mínimos. La Fase 2 requiere colaboración más estrecha ya que los tracks H e I están profundamente conectados, por lo que se recomienda trabajar en parejas.
