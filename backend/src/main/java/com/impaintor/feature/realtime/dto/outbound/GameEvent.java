package com.impaintor.feature.realtime.dto.outbound;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * Evento del juego difundido a {@code /topic/room.{code}.game}.
 *
 * <p>Discriminador {@code type} (ver sección 6.2 de CLAUDE.md). Los Tracks H/I
 * conocerán solo {@link GameEvent} — no necesitan tocar STOMP/Jackson.</p>
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = GameEvent.GameStart.class, name = "GAME_START"),
        @JsonSubTypes.Type(value = GameEvent.TurnStart.class, name = "TURN_START"),
        @JsonSubTypes.Type(value = GameEvent.TurnEnd.class, name = "TURN_END"),
        @JsonSubTypes.Type(value = GameEvent.GalleryPhase.class, name = "GALLERY_PHASE"),
        @JsonSubTypes.Type(value = GameEvent.VotePhase.class, name = "VOTE_PHASE"),
        @JsonSubTypes.Type(value = GameEvent.VoteResult.class, name = "VOTE_RESULT"),
        @JsonSubTypes.Type(value = GameEvent.VoteTie.class, name = "VOTE_TIE"),
        @JsonSubTypes.Type(value = GameEvent.GuessAttempt.class, name = "GUESS_ATTEMPT"),
        @JsonSubTypes.Type(value = GameEvent.NewRound.class, name = "NEW_ROUND"),
        @JsonSubTypes.Type(value = GameEvent.GameOver.class, name = "GAME_OVER")
})
public sealed interface GameEvent {

    record TopVote(Long id, int votes) {}

    record GameStart(List<Long> drawingOrder, int round) implements GameEvent {}

    record TurnStart(Long playerId, int timeSeconds) implements GameEvent {}

    record TurnEnd(Long playerId) implements GameEvent {}

    record GalleryPhase() implements GameEvent {}

    record VotePhase(int timeSeconds) implements GameEvent {}

    record VoteResult(Long eliminated, boolean wasImpostor, List<TopVote> topVoted) implements GameEvent {}

    record VoteTie(List<TopVote> tiedPlayers, int timeSeconds) implements GameEvent {}

    record GuessAttempt(int livesRemaining, boolean correct) implements GameEvent {}

    record NewRound(int round, List<Long> drawingOrder) implements GameEvent {}

    record GameOver(String winner, String reason, Long impostorId, String secretWord) implements GameEvent {}
}
