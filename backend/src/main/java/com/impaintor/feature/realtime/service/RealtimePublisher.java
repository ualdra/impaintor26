package com.impaintor.feature.realtime.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.impaintor.feature.realtime.dto.outbound.ClearCanvasBroadcast;
import com.impaintor.feature.realtime.dto.outbound.GameEvent;
import com.impaintor.feature.realtime.dto.outbound.GuessResult;
import com.impaintor.feature.realtime.dto.outbound.RoleAssignment;
import com.impaintor.feature.realtime.dto.outbound.StrokeBroadcast;

/**
 * Fachada tipada sobre {@link SimpMessagingTemplate}. Tracks H/I (game engine)
 * inyectarán este bean para emitir eventos sin conocer detalles del transporte
 * STOMP/RabbitMQ ni nombres de topics.
 */
@Service
public class RealtimePublisher {

    private static final String DRAW_TOPIC = "/topic/room.%s.draw";
    private static final String GAME_TOPIC = "/topic/room.%s.game";
    private static final String PRIVATE_QUEUE = "/queue/private";

    private final SimpMessagingTemplate messaging;

    public RealtimePublisher(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    public void broadcastStroke(String roomCode, StrokeBroadcast stroke) {
        messaging.convertAndSend(DRAW_TOPIC.formatted(roomCode), stroke);
    }

    public void broadcastClear(String roomCode, ClearCanvasBroadcast clear) {
        messaging.convertAndSend(DRAW_TOPIC.formatted(roomCode), clear);
    }

    public void publishGameEvent(String roomCode, GameEvent event) {
        messaging.convertAndSend(GAME_TOPIC.formatted(roomCode), event);
    }

    public void sendRoleAssignment(Long userId, RoleAssignment assignment) {
        messaging.convertAndSendToUser(String.valueOf(userId), PRIVATE_QUEUE, assignment);
    }

    public void sendGuessResult(Long userId, GuessResult result) {
        messaging.convertAndSendToUser(String.valueOf(userId), PRIVATE_QUEUE, result);
    }
}
