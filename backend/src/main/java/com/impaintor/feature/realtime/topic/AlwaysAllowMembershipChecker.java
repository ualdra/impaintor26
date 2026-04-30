package com.impaintor.feature.realtime.topic;

/**
 * Stub provisional. PENDING — Track B (Rooms) reemplazará con una impl
 * que consulte {@code RoomService}/{@code Room.containsPlayer(userId)}.
 *
 * <p>Se registra vía {@code RealtimeStubsConfig} con
 * {@code @ConditionalOnMissingBean} para que el bean real de Track B sustituya
 * a este stub automáticamente sin tocar código de Track D.</p>
 */
public class AlwaysAllowMembershipChecker implements RoomMembershipChecker {

    @Override
    public boolean isMember(String roomCode, Long userId) {
        return true;
    }
}
