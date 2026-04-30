package com.impaintor.feature.realtime.security;

import java.util.Optional;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/**
 * Valida el JWT en el frame STOMP CONNECT y ata un {@link StompPrincipal} a la sesión.
 * Los frames posteriores (SEND/SUBSCRIBE/...) no se revalidan: la autenticación
 * persiste mientras dure la sesión WebSocket.
 */
@Component
public class JwtChannelInterceptor implements ChannelInterceptor {

    private static final String AUTH_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final TokenValidator tokenValidator;

    public JwtChannelInterceptor(TokenValidator tokenValidator) {
        this.tokenValidator = tokenValidator;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || !StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        String rawAuth = accessor.getFirstNativeHeader(AUTH_HEADER);
        if (rawAuth == null || rawAuth.isBlank()) {
            throw new MessagingException("Missing Authorization header on STOMP CONNECT");
        }

        String token = rawAuth.startsWith(BEARER_PREFIX) ? rawAuth.substring(BEARER_PREFIX.length()) : rawAuth;
        Optional<AuthenticatedUser> validated = tokenValidator.validate(token);
        if (validated.isEmpty()) {
            throw new MessagingException("Invalid or expired token on STOMP CONNECT");
        }

        accessor.setUser(new StompPrincipal(validated.get()));
        return message;
    }
}
