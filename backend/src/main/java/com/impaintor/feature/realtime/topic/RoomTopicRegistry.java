package com.impaintor.feature.realtime.topic;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * Registro thread-safe de salas con topics activos.
 *
 * <p>Track B (Rooms) llamará a {@link #registerRoom(String)} al crear una sala
 * y a {@link #unregisterRoom(String)} al destruirla. Otros componentes (handlers
 * de dibujo, voto, etc.) consultan {@link #isRegistered(String)} antes de aceptar
 * mensajes para evitar publicar a topics fantasma.</p>
 *
 * <p>En modo {@code relay} se podría declarar el topic exchange de RabbitMQ
 * dinámicamente vía {@code AmqpAdmin} (no necesario por ahora — RabbitMQ usa
 * {@code amq.topic} con routing keys, sin necesidad de declarar exchange por sala).</p>
 */
@Component
public class RoomTopicRegistry {

    private final Set<String> rooms = ConcurrentHashMap.newKeySet();

    public void registerRoom(String roomCode) {
        rooms.add(roomCode);
    }

    public void unregisterRoom(String roomCode) {
        rooms.remove(roomCode);
    }

    public boolean isRegistered(String roomCode) {
        return rooms.contains(roomCode);
    }

    public Set<String> registeredRooms() {
        return Set.copyOf(rooms);
    }
}
