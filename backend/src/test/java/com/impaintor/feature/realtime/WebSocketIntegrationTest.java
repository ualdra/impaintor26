package com.impaintor.feature.realtime;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Type;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import com.impaintor.feature.realtime.dto.inbound.Point;
import com.impaintor.feature.realtime.dto.inbound.StrokeMessage;
import com.impaintor.feature.realtime.dto.outbound.RoleAssignment;
import com.impaintor.feature.realtime.security.AuthenticatedUser;
import com.impaintor.feature.realtime.security.TokenValidator;
import com.impaintor.feature.realtime.service.RealtimePublisher;

/**
 * Test end-to-end: cliente WebSocketStompClient real conectado contra el servidor
 * Spring (perfil test → SimpleBroker, sin RabbitMQ). Verifica wiring de
 * WebSocketConfig + JwtChannelInterceptor + DrawWebSocketController + RealtimePublisher.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class WebSocketIntegrationTest {

    @LocalServerPort int port;
    @Autowired RealtimePublisher publisher;

    private WebSocketStompClient client;
    private StompSession session;

    @TestConfiguration
    static class FakeTokenValidatorConfig {
        @Bean
        @Primary
        TokenValidator fakeTokenValidator() {
            return rawToken -> {
                if (rawToken == null) return Optional.empty();
                String[] parts = rawToken.split(":");
                if (parts.length != 3 || !"user".equals(parts[0])) return Optional.empty();
                return Optional.of(new AuthenticatedUser(Long.valueOf(parts[1]), parts[2]));
            };
        }
    }

    @BeforeEach
    void setUp() {
        client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new MappingJackson2MessageConverter());
    }

    @AfterEach
    void tearDown() {
        if (session != null && session.isConnected()) {
            session.disconnect();
        }
        client.stop();
    }

    @Test
    void clientConnectsWithValidToken_subscribesAndReceivesStrokeBroadcast() throws Exception {
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer user:42:alice");
        WebSocketHttpHeaders wsHeaders = new WebSocketHttpHeaders();

        session = client.connectAsync(
                        "ws://localhost:" + port + "/ws",
                        wsHeaders,
                        connectHeaders,
                        new StompSessionHandlerAdapter() {})
                .get(5, TimeUnit.SECONDS);

        LinkedBlockingQueue<Object> received = new LinkedBlockingQueue<>();
        session.subscribe("/topic/room.TEST.draw", new CapturingFrameHandler(received, java.util.Map.class));

        Thread.sleep(200);

        StrokeMessage stroke = new StrokeMessage(List.of(new Point(10, 20)), "#00FF00", 5);
        StompHeaders sendHeaders = new StompHeaders();
        sendHeaders.setDestination("/app/room.TEST.draw");
        sendHeaders.add("content-type", "application/json");
        sendHeaders.setContentType(org.springframework.util.MimeTypeUtils.APPLICATION_JSON);
        // Añadimos el discriminador "type" para que el deserializador polimórfico funcione.
        java.util.Map<String, Object> payload = new java.util.LinkedHashMap<>();
        payload.put("type", "STROKE");
        payload.put("points", stroke.points());
        payload.put("color", stroke.color());
        payload.put("thickness", stroke.thickness());
        session.send(sendHeaders, payload);

        Object broadcast = received.poll(3, TimeUnit.SECONDS);
        assertThat(broadcast).as("stroke broadcast received").isNotNull();
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> map = (java.util.Map<String, Object>) broadcast;
        assertThat(map).containsEntry("type", "STROKE");
        assertThat(map).containsEntry("playerId", 42);
        assertThat(map).containsEntry("color", "#00FF00");
        assertThat(map).containsEntry("thickness", 5);
    }

    @Test
    void clientReceivesPrivateRoleAssignment() throws Exception {
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer user:42:alice");

        session = client.connectAsync(
                        "ws://localhost:" + port + "/ws",
                        new WebSocketHttpHeaders(),
                        connectHeaders,
                        new StompSessionHandlerAdapter() {})
                .get(5, TimeUnit.SECONDS);

        LinkedBlockingQueue<Object> received = new LinkedBlockingQueue<>();
        session.subscribe("/user/queue/private", new CapturingFrameHandler(received, java.util.Map.class));

        Thread.sleep(300);

        publisher.sendRoleAssignment(42L, new RoleAssignment.Painter("guitarra"));

        Object msg = received.poll(3, TimeUnit.SECONDS);
        assertThat(msg).as("private role assignment received").isNotNull();
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> map = (java.util.Map<String, Object>) msg;
        assertThat(map).containsEntry("type", "ROLE_ASSIGNMENT");
        assertThat(map).containsEntry("role", "PAINTER");
        assertThat(map).containsEntry("word", "guitarra");
    }

    @Test
    void clientWithoutAuthHeader_isRejected() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                client.connectAsync(
                                "ws://localhost:" + port + "/ws",
                                new WebSocketHttpHeaders(),
                                new StompHeaders(),
                                new StompSessionHandlerAdapter() {})
                        .get(5, TimeUnit.SECONDS)
        ).isNotNull();
    }

    private record CapturingFrameHandler(LinkedBlockingQueue<Object> sink, Class<?> type) implements StompFrameHandler {
        @Override
        public Type getPayloadType(StompHeaders headers) {
            return type;
        }

        @Override
        public void handleFrame(StompHeaders headers, Object payload) {
            sink.offer(payload);
        }
    }
}
