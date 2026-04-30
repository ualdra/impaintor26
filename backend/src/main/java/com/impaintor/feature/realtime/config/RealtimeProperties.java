package com.impaintor.feature.realtime.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Tipado de la sección {@code impaintor.realtime} de {@code application.yml}.
 *
 * <p>Centraliza el secret JWT, modo de broker (relay→RabbitMQ vs simple in-memory)
 * y endpoint WebSocket para que tanto Track A (auth) como Track D (realtime)
 * compartan configuración sin duplicar.</p>
 */
@ConfigurationProperties(prefix = "impaintor.realtime")
public record RealtimeProperties(
        Broker broker,
        Jwt jwt,
        Websocket websocket
) {
    public record Broker(
            String mode,
            String relayHost,
            int relayPort,
            String relayLogin,
            String relayPasscode
    ) {
        public boolean isSimple() {
            return "simple".equalsIgnoreCase(mode);
        }
    }

    public record Jwt(String secret, String issuer) {}

    public record Websocket(String endpoint, List<String> allowedOrigins) {}
}
