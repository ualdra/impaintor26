package com.impaintor.feature.realtime.topic;

/**
 * SPI para comprobar pertenencia de un usuario a una sala antes de aceptar
 * mensajes en tiempo real (anti-spoofing — un usuario no podría enviar trazos
 * a una sala en la que no está).
 *
 * <p>PENDING — Track B (Rooms) sustituirá la impl provisional
 * {@link AlwaysAllowMembershipChecker} con una consulta a {@code RoomService}.</p>
 */
public interface RoomMembershipChecker {

    boolean isMember(String roomCode, Long userId);
}
