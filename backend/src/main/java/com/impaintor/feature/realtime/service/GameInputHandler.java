package com.impaintor.feature.realtime.service;

/**
 * SPI de inputs del juego que llegan vía STOMP. PENDING — Track H (Game engine)
 * proveerá una impl real (típicamente {@code GameService}) que actualice el
 * estado en memoria, recalcule condiciones de victoria y emita eventos vía
 * {@link RealtimePublisher}.
 *
 * <p>Mientras Track H no exista, {@link LoggingGameInputHandler} actúa de
 * placeholder y deja registro en el log.</p>
 */
public interface GameInputHandler {

    void onVote(String roomCode, Long voterId, Long votedPlayerId);

    void onGuess(String roomCode, Long impostorId, String guess);
}
