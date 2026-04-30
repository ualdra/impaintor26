package com.impaintor.feature.realtime.controller;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import com.impaintor.feature.realtime.dto.inbound.ClearCanvasMessage;
import com.impaintor.feature.realtime.dto.inbound.DrawCommand;
import com.impaintor.feature.realtime.dto.inbound.StrokeMessage;
import com.impaintor.feature.realtime.dto.outbound.ClearCanvasBroadcast;
import com.impaintor.feature.realtime.dto.outbound.StrokeBroadcast;
import com.impaintor.feature.realtime.security.StompPrincipal;
import com.impaintor.feature.realtime.service.RealtimePublisher;
import com.impaintor.feature.realtime.topic.RoomMembershipChecker;

/**
 * Recibe comandos de dibujo (STROKE/CLEAR) en {@code /app/room.{code}.draw} y
 * los reenvía al topic de la sala tras verificar pertenencia. El {@code playerId}
 * del payload se ignora — se usa el id del Principal autenticado.
 */
@Controller
public class DrawWebSocketController {

    private final RealtimePublisher publisher;
    private final RoomMembershipChecker membership;

    public DrawWebSocketController(RealtimePublisher publisher, RoomMembershipChecker membership) {
        this.publisher = publisher;
        this.membership = membership;
    }

    @MessageMapping("/room.{code}.draw")
    public void onDraw(@DestinationVariable String code,
                       @Payload DrawCommand command,
                       StompPrincipal principal) {
        Long playerId = principal.user().id();
        if (!membership.isMember(code, playerId)) {
            return;
        }
        if (command instanceof StrokeMessage s) {
            publisher.broadcastStroke(code,
                    new StrokeBroadcast(playerId, s.points(), s.color(), s.thickness()));
        } else if (command instanceof ClearCanvasMessage) {
            publisher.broadcastClear(code, new ClearCanvasBroadcast(playerId));
        }
    }
}
