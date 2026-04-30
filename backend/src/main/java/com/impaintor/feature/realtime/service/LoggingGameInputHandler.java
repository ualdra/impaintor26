package com.impaintor.feature.realtime.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Stub provisional. PENDING — Track H sustituirá con {@code GameService}.
 *
 * <p>Se registra vía {@code RealtimeStubsConfig} con
 * {@code @ConditionalOnMissingBean} para que el bean real de Track H se
 * active automáticamente cuando esté disponible.</p>
 */
public class LoggingGameInputHandler implements GameInputHandler {

    private static final Logger log = LoggerFactory.getLogger(LoggingGameInputHandler.class);

    @Override
    public void onVote(String roomCode, Long voterId, Long votedPlayerId) {
        log.info("[STUB] vote received roomCode={} voterId={} votedPlayerId={}", roomCode, voterId, votedPlayerId);
    }

    @Override
    public void onGuess(String roomCode, Long impostorId, String guess) {
        log.info("[STUB] guess received roomCode={} impostorId={} guess={}", roomCode, impostorId, guess);
    }
}
