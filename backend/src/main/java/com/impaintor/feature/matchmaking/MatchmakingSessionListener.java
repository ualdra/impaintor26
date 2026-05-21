package com.impaintor.feature.matchmaking;

import com.impaintor.feature.matchmaking.service.MatchmakingService;
import com.impaintor.feature.realtime.security.StompPrincipal;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
@RequiredArgsConstructor
@Slf4j
public class MatchmakingSessionListener {

    private final MatchmakingService matchmakingService;

    // sessionId → userId, populated on STOMP CONNECT, cleaned up on disconnect.
    private final ConcurrentHashMap<String, Long> sessionUserMap = new ConcurrentHashMap<>();

    @EventListener
    public void onSessionConnected(SessionConnectedEvent event) {
        if (!(event.getUser() instanceof StompPrincipal principal)) return;

        String sessionId = StompHeaderAccessor.wrap(event.getMessage()).getSessionId();
        if (sessionId == null) return;

        sessionUserMap.put(sessionId, principal.user().id());
    }

    @EventListener
    public void onSessionDisconnected(SessionDisconnectEvent event) {
        Long userId = sessionUserMap.remove(event.getSessionId());
        if (userId == null) return;

        matchmakingService.leave(userId);
        log.debug("Player {} removed from matchmaking queue on WebSocket disconnect", userId);
    }
}