package com.impaintor.feature.realtime.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Configuración de seguridad mínima para que el endpoint WebSocket {@code /ws}
 * sea accesible — el JWT se valida en STOMP CONNECT, no en HTTP.
 *
 * <p>PENDING — Track A (Auth) creará un {@code SecurityFilterChain} con cobertura
 * completa (filtro JWT en HTTP para los endpoints REST, CSRF, CORS, etc).
 * Cuando ese bean exista, este se desactivará vía {@link ConditionalOnMissingBean}.</p>
 */
@Configuration
public class RealtimeSecurityConfig {

    @Bean
    @ConditionalOnMissingBean(SecurityFilterChain.class)
    public SecurityFilterChain realtimeSecurityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
