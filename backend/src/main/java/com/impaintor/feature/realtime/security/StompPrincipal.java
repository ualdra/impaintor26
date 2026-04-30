package com.impaintor.feature.realtime.security;

import java.security.Principal;

/**
 * Principal anclado a la sesión STOMP tras un CONNECT autenticado.
 * El nombre devuelto es el id numérico del usuario para que
 * {@code SimpMessagingTemplate.convertAndSendToUser(name, ...)} resuelva
 * la cola privada {@code /user/queue/...}.
 */
public record StompPrincipal(AuthenticatedUser user) implements Principal {

    @Override
    public String getName() {
        return String.valueOf(user.id());
    }
}
