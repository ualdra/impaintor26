package com.impaintor.feature.realtime.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.context.ActiveProfiles;

import com.impaintor.feature.realtime.security.JwtChannelInterceptor;
import com.impaintor.feature.realtime.service.RealtimePublisher;

@SpringBootTest
@ActiveProfiles("test")
class WebSocketConfigTest {

    @Autowired(required = false) WebSocketConfig webSocketConfig;
    @Autowired(required = false) RealtimeProperties properties;
    @Autowired(required = false) JwtChannelInterceptor jwtInterceptor;
    @Autowired(required = false) SimpMessagingTemplate messagingTemplate;
    @Autowired(required = false) RealtimePublisher realtimePublisher;

    @Test
    void contextLoadsAllRealtimeBeans() {
        assertThat(webSocketConfig).as("WebSocketConfig bean").isNotNull();
        assertThat(properties).as("RealtimeProperties bean").isNotNull();
        assertThat(jwtInterceptor).as("JwtChannelInterceptor bean").isNotNull();
        assertThat(messagingTemplate).as("SimpMessagingTemplate bean").isNotNull();
        assertThat(realtimePublisher).as("RealtimePublisher bean").isNotNull();
    }

    @Test
    void testProfileUsesSimpleBroker() {
        assertThat(properties.broker().isSimple()).isTrue();
    }

    @Test
    void websocketEndpointIsConfigured() {
        assertThat(properties.websocket().endpoint()).isEqualTo("/ws");
    }
}
