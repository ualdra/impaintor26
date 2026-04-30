package com.impaintor.feature.realtime.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import com.impaintor.feature.realtime.security.JwtChannelInterceptor;

/**
 * Configuración WebSocket/STOMP de Impaintor.
 *
 * <ul>
 *   <li>Endpoint: {@code /ws} (SockJS opcional desactivado — el cliente Angular
 *       usará {@code @stomp/stompjs} sobre WebSocket nativo).</li>
 *   <li>Application destination prefix: {@code /app}.</li>
 *   <li>User destination prefix: {@code /user} (para mensajes privados).</li>
 *   <li>Broker:
 *       <ul>
 *         <li>Modo {@code relay} (prod): {@code StompBrokerRelay} hacia RabbitMQ
 *             en {@code relayHost:relayPort} (típicamente {@code rabbitmq:61613}
 *             vía plugin STOMP).</li>
 *         <li>Modo {@code simple} (test): broker en memoria de Spring sin
 *             dependencia de RabbitMQ.</li>
 *       </ul>
 *   </li>
 *   <li>Inbound channel interceptado por {@link JwtChannelInterceptor} para
 *       validar el JWT en cada CONNECT.</li>
 * </ul>
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final RealtimeProperties properties;
    private final JwtChannelInterceptor jwtChannelInterceptor;

    public WebSocketConfig(RealtimeProperties properties, JwtChannelInterceptor jwtChannelInterceptor) {
        this.properties = properties;
        this.jwtChannelInterceptor = jwtChannelInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");

        if (properties.broker().isSimple()) {
            registry.enableSimpleBroker("/topic", "/queue");
        } else {
            RealtimeProperties.Broker b = properties.broker();
            registry.enableStompBrokerRelay("/topic", "/queue")
                    .setRelayHost(b.relayHost())
                    .setRelayPort(b.relayPort())
                    .setClientLogin(b.relayLogin())
                    .setClientPasscode(b.relayPasscode())
                    .setSystemLogin(b.relayLogin())
                    .setSystemPasscode(b.relayPasscode());
        }
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = properties.websocket().allowedOrigins().toArray(String[]::new);
        registry.addEndpoint(properties.websocket().endpoint())
                .setAllowedOriginPatterns(origins);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(jwtChannelInterceptor);
    }
}
