package com.impaintor.feature.realtime.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

class JwtChannelInterceptorTest {

    private TokenValidator tokenValidator;
    private JwtChannelInterceptor interceptor;
    private MessageChannel channel;

    @BeforeEach
    void setUp() {
        tokenValidator = mock(TokenValidator.class);
        interceptor = new JwtChannelInterceptor(tokenValidator);
        channel = mock(MessageChannel.class);
    }

    @Test
    void connectWithValidBearerToken_attachesPrincipal() {
        AuthenticatedUser user = new AuthenticatedUser(42L, "alice");
        when(tokenValidator.validate("the-token")).thenReturn(Optional.of(user));

        Message<?> message = stompMessage(StompCommand.CONNECT, "Bearer the-token");

        Message<?> result = interceptor.preSend(message, channel);

        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(result);
        assertThat(accessor.getUser()).isInstanceOf(StompPrincipal.class);
        StompPrincipal principal = (StompPrincipal) accessor.getUser();
        assertThat(principal.user()).isEqualTo(user);
        assertThat(principal.getName()).isEqualTo("42");
    }

    @Test
    void connectWithRawTokenWithoutBearerPrefix_isAccepted() {
        AuthenticatedUser user = new AuthenticatedUser(7L, "bob");
        when(tokenValidator.validate("raw-token")).thenReturn(Optional.of(user));

        Message<?> message = stompMessage(StompCommand.CONNECT, "raw-token");

        Message<?> result = interceptor.preSend(message, channel);

        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(result);
        assertThat(accessor.getUser()).isNotNull();
    }

    @Test
    void connectWithoutAuthorizationHeader_isRejected() {
        Message<?> message = stompMessage(StompCommand.CONNECT, null);

        assertThatThrownBy(() -> interceptor.preSend(message, channel))
                .isInstanceOf(org.springframework.messaging.MessagingException.class);
    }

    @Test
    void connectWithInvalidToken_isRejected() {
        when(tokenValidator.validate(any())).thenReturn(Optional.empty());

        Message<?> message = stompMessage(StompCommand.CONNECT, "Bearer bad-token");

        assertThatThrownBy(() -> interceptor.preSend(message, channel))
                .isInstanceOf(org.springframework.messaging.MessagingException.class);
    }

    @Test
    void sendCommand_passesThroughWithoutRevalidation() {
        Message<?> message = stompMessage(StompCommand.SEND, null);

        Message<?> result = interceptor.preSend(message, channel);

        assertThat(result).isSameAs(message);
    }

    @Test
    void subscribeCommand_passesThroughWithoutRevalidation() {
        Message<?> message = stompMessage(StompCommand.SUBSCRIBE, null);

        Message<?> result = interceptor.preSend(message, channel);

        assertThat(result).isSameAs(message);
    }

    private Message<byte[]> stompMessage(StompCommand command, String authHeader) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setLeaveMutable(true);
        if (authHeader != null) {
            accessor.setNativeHeader("Authorization", authHeader);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
