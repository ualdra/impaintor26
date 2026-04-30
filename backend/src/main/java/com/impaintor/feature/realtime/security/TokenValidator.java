package com.impaintor.feature.realtime.security;

import java.util.Optional;

/**
 * SPI para validar tokens de autenticación al abrir una sesión STOMP.
 *
 * <p>PENDING — Track A (Auth) emitirá tokens JWT firmados con el secret de
 * {@code impaintor.realtime.jwt.secret}. La impl por defecto
 * {@link JwtTokenValidator} ya parsea ese formato; cuando Track A esté listo,
 * los login flows simplemente firmarán tokens con el mismo secret y este
 * validador los aceptará sin cambios.</p>
 */
public interface TokenValidator {

    /**
     * @param rawToken contenido del header {@code Authorization} sin el prefijo {@code Bearer }.
     * @return el usuario autenticado si el token es válido y no ha expirado, vacío en cualquier otro caso.
     */
    Optional<AuthenticatedUser> validate(String rawToken);
}
