## 📖 Descripción del Proyecto
Aplicación multijugador con interfaz gráfica basada en mecánicas de deducción y roles ocultos. El flujo central del juego desafía la capacidad de los usuarios para transmitir conceptos visuales sin revelar información clave al jugador que desconoce el contexto.

## ⚙️ Mecánica de Juego (Core Loop)
1.  **Asignación de Roles:** Al iniciar la ronda, el servidor asigna aleatoriamente el rol de "Impostor" a un único jugador.
2.  **Distribución de Datos:** El servidor selecciona una palabra (aleatoria o de un *pool* preaprobado) y la transmite a los clientes de todos los jugadores, aislando al Impostor (que no recibe la palabra).
3.  **Fase de Dibujo:** Los jugadores deben dibujar en el lienzo compartido pistas visuales relacionadas con el concepto (De conocerlo).
4.  **Fase de Deducción:** A través de los trazos, los jugadores legítimos deben identificar quién está dibujando sin contexto (el Impostor), mientras que el Impostor debe intentar mimetizarse con el resto para no ser descubierto.