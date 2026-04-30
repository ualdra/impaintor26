package com.impaintor.feature.realtime.controller;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import com.impaintor.feature.realtime.dto.inbound.GuessMessage;
import com.impaintor.feature.realtime.dto.inbound.VoteMessage;
import com.impaintor.feature.realtime.security.StompPrincipal;
import com.impaintor.feature.realtime.service.GameInputHandler;
import com.impaintor.feature.realtime.topic.RoomMembershipChecker;

/**
 * Recibe inputs del juego (votos y adivinaciones) del cliente y los delega al
 * {@link GameInputHandler} (Track H). El id del jugador se toma del Principal
 * autenticado, nunca del payload.
 */
@Controller
public class GameInputWebSocketController {

    private final GameInputHandler handler;
    private final RoomMembershipChecker membership;

    public GameInputWebSocketController(GameInputHandler handler, RoomMembershipChecker membership) {
        this.handler = handler;
        this.membership = membership;
    }

    @MessageMapping("/room.{code}.vote")
    public void onVote(@DestinationVariable String code,
                       @Payload VoteMessage message,
                       StompPrincipal principal) {
        Long voterId = principal.user().id();
        if (!membership.isMember(code, voterId)) {
            return;
        }
        handler.onVote(code, voterId, message.votedPlayerId());
    }

    @MessageMapping("/room.{code}.guess")
    public void onGuess(@DestinationVariable String code,
                        @Payload GuessMessage message,
                        StompPrincipal principal) {
        Long impostorId = principal.user().id();
        if (!membership.isMember(code, impostorId)) {
            return;
        }
        handler.onGuess(code, impostorId, message.guess());
    }
}
