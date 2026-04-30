package com.impaintor.feature.realtime.security;

/**
 * Identidad autenticada extraída de un JWT al abrir la sesión STOMP.
 * El {@code id} corresponde al usuario en la base de datos (Track A — Users).
 */
public record AuthenticatedUser(Long id, String username) {
}
