package com.impaintor.feature.realtime.service;

public interface GameInputHandler {

    void onVote(String roomCode, Long voterId, Long votedPlayerId);

    void onGuess(String roomCode, Long impostorId, String guess);

    void onVoteMove(String roomCode, Long impostorId, Long targetPlayerId);
}
