# ImPaintor
[![Backend Tests](https://github.com/ualdra/impaintor26/actions/workflows/backend-ci.yml/badge.svg?branch=main)](https://github.com/ualdra/impaintor26/actions/workflows/backend-ci.yml)
[![Frontend Tests](https://github.com/ualdra/impaintor26/actions/workflows/frontend-ci.yml/badge.svg?branch=main)](https://github.com/ualdra/impaintor26/actions/workflows/frontend-ci.yml)
[![Deploy](https://github.com/ualdra/impaintor26/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/ualdra/impaintor26/actions/workflows/deploy.yml)

ImPaintor es un juego multijugador de dibujo y deducción con roles ocultos. La partida gira alrededor de una palabra secreta que solo conocen los pintores, mientras que un jugador actúa como impostor e intenta que no lo descubran. La partida termina cuando el impostor adivina la palabra, es echado por votación o falla al adivinar.

## Equipo

- Líder: Abel Rodríguez Gutiérrez
- Juan Francisco Escobosa Brocal
- María López Espinosa
- Victor Vallejo Uroz
- Javier Saiz Gomez
- José Esteban Pérez González
- Teo Zaitegui Jódar

## Términos

- Pintor: jugador que conoce la palabra secreta y debe dibujar algo relacionado con ella.
- Impostor: jugador que no conoce la palabra y debe improvisar para no ser descubierto.
- Sala: espacio de juego donde se reúnen los jugadores.
- Ronda: ciclo de dibujo, galería y votación.
- Pista: palabra relacionada que recibe el impostor para orientarse.
- Votación: fase en la que los jugadores eligen a quién creen que es el impostor.
- ELO: puntuación usada para el modo ranked.
- RabbitMQ / STOMP: sistema de mensajería en tiempo real para dibujos y eventos de partida.

## Estructura del proyecto

- [backend/](backend) contiene la API REST, la lógica de juego, WebSocket/STOMP, seguridad y persistencia.
- [frontend/](frontend) contiene la aplicación Angular, las vistas del juego y el cliente en tiempo real.
- [docker-compose.yml](docker-compose.yml) levanta backend, frontend, PostgreSQL y RabbitMQ.

### Backend

- [backend/src/main/java/com/impaintor/feature/game](backend/src/main/java/com/impaintor/feature/game) concentra el motor de partida.
- [backend/src/main/java/com/impaintor/feature/game/model](backend/src/main/java/com/impaintor/feature/game/model) define el estado en memoria, eventos y resultados.
- [backend/src/main/java/com/impaintor/feature/game/service](backend/src/main/java/com/impaintor/feature/game/service) reparte la lógica entre inicio de partida, reglas, votación, desempate y fin de partida.
- [backend/src/main/java/com/impaintor/feature/realtime](backend/src/main/java/com/impaintor/feature/realtime) agrupa los controladores WebSocket, el publisher y la seguridad de mensajería.
- [backend/src/main/java/com/impaintor/feature/room](backend/src/main/java/com/impaintor/feature/room) gestiona salas, jugadores y configuración.
- [backend/src/main/java/com/impaintor/feature/user](backend/src/main/java/com/impaintor/feature/user) cubre autenticación y perfil.
- [backend/src/main/java/com/impaintor/feature/wordgroup](backend/src/main/java/com/impaintor/feature/wordgroup) gestiona los grupos de palabras.
- [backend/src/main/resources](backend/src/main/resources) contiene la configuración de Spring y los datos de arranque.
- [backend/src/test/java](backend/src/test/java) reúne las pruebas automatizadas.

### Frontend

- [frontend/src/app/features/game](frontend/src/app/features/game) contiene el contenedor principal de la partida y sus vistas.
- [frontend/src/app/features/game/containers/game](frontend/src/app/features/game/containers/game) orquesta el flujo visual según la fase actual.
- [frontend/src/app/features/game/components](frontend/src/app/features/game/components) incluye las vistas de dibujo, galería, votación, desempate, resultado y fin de partida.
- [frontend/src/app/features/game/services](frontend/src/app/features/game/services) mantiene el estado del juego en el cliente y el espejo de eventos del servidor.
- [frontend/src/app/features/room](frontend/src/app/features/room) gestiona crear y unirse a salas.
- [frontend/src/app/features/home](frontend/src/app/features/home) agrupa el menú principal.
- [frontend/src/app/core](frontend/src/app/core) concentra autenticación, WebSocket y servicios globales.
- [frontend/public](frontend/public) almacena recursos estáticos como imágenes y música.

## Flujo de juego completo

1. El jugador inicia sesión y entra al lobby de una sala o al modo ranked.
2. Cuando el anfitrión arranca la partida, el backend elige un grupo de 3 palabras, selecciona una palabra secreta, asigna una pista al impostor y decide quién será el impostor.
3. El servidor envía asignaciones privadas: los pintores reciben la palabra secreta y el impostor recibe su pista.
4. La partida entra en fase de dibujo. Los jugadores dibujan por turnos en el orden establecido de forma aleatoria. El resto ve los trazos en tiempo real.
5. Cuando todos han dibujado, se pasa a la galería y se muestran las capturas de cada turno para que todos las comparen.
6. Después comienza la votación. Si un jugador no vota, cuenta como voto hacia sí mismo. En la primera ronda, si hay empate, no se elimina a nadie. A partir de la segunda ronda, un empate activa el desempate.
7. En el desempate, el impostor puede mover su voto para romper el empate. Si no lo hace a tiempo, pierde automáticamente y ganan los pintores.
8. En cualquier momento de la partida el impostor puede intentar adivinar la palabra. Si acierta, gana. Si falla, pierde.
9. La partida termina si el impostor es expulsado, si adivina correctamente, si falla la palabra o si sobrevive hasta quedar solo con un pintor.
10. Al terminar, el backend guarda el resultado y actualiza estadísticas y ELO cuando corresponde.

## Guía de uso

### Requisitos

- Java 17 para el backend.
- Node.js 20 o superior para el frontend.
- Docker y Docker Compose si quieres levantar todo el entorno de una vez.

### Opción recomendada: Docker

1. Ejecuta `docker compose up --build` desde la raíz del proyecto.
2. Espera a que se levanten backend, frontend, PostgreSQL y RabbitMQ.
3. Abre la aplicación en `http://localhost:4200`.
4. El backend queda disponible en `http://localhost:8080`.
5. La consola de RabbitMQ está en `http://localhost:15672`.

### Opción de desarrollo local

Backend:

1. Entra en la carpeta `backend`.
2. Ejecuta  `mvnw.cmd spring-boot:run`.

Frontend:

1. Entra en la carpeta `frontend`.
2. Ejecuta `npm install` la primera vez.
3. Ejecuta `npm start`.
4. Abre `http://localhost:4200`.

### Resumen del flujo juego.

1. Regístrate o inicia sesión.
2. Crea una sala o únete con un código.
3. Espera al resto de jugadores en el lobby.
4. Inicia la partida y sigue las fases de dibujo, galería, votación y posible desempate.
5. La partida termina cuando el impostor es descubierto, falla la palabra o gana adivinando.
