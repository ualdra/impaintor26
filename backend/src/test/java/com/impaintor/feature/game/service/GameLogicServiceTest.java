package com.impaintor.feature.game.service;

import com.impaintor.feature.game.models.GameState;
import com.impaintor.feature.game.models.GuessResult;
import com.impaintor.feature.game.models.VoteResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.util.Map;
import java.util.HashMap;
import java.util.List;

public class GameLogicServiceTest {

    private GameLogicService gameLogicService;
    private GameState mockState;

    @BeforeEach
    void setUp() {
        gameLogicService = new GameLogicService();
        mockState = new GameState();
        mockState.setSecretWord("word");
    }

    @Test
    void testImpostorCorrectGuess() {
        GuessResult result = gameLogicService.handleImpostorGuess(mockState, "word");
        assertTrue(result.isCorrect());
        assertTrue(result.isGameOver());
        assertEquals("IMPAINTOR", result.getWinner());
    }

    @Test
    void testImpostorWrongGuess() {
        GuessResult result = gameLogicService.handleImpostorGuess(mockState, "wrong");
        assertFalse(result.isCorrect());
        assertTrue(result.isGameOver());
        assertEquals("PAINTORS", result.getWinner());
    }

    @Test
    void testRound1Tie() {
        mockState.setCurrentRound(1);
        mockState.setImpostorId(1L);
        // Añadimos los jugadores vivos por precaución
        mockState.setAlivePlayerId(List.of(1L, 2L, 3L, 4L));

        // CORRECCIÓN: Ahora sí es un empate real (Jugador 1 tiene 2 votos, Jugador 2
        // tiene 2 votos)
        Map<Long, Long> votes = Map.of(
                1L, 1L,
                2L, 1L,
                3L, 2L,
                4L, 2L);

        VoteResult result = gameLogicService.handleVotes(mockState, votes);
        assertFalse(result.isGameOver());
        assertTrue(result.isNobodyEliminated());
        assertNull(result.getEliminatedPlayerId());
        assertFalse(result.isTie());
    }

    @Test
    void testPlayerVotedOutBeingImpaintor() {
        mockState.setImpostorId(1L);
        mockState.setAlivePlayerId(List.of(1L, 2L, 3L, 4L));

        Map<Long, Long> votes = Map.of(
                1L, 2L,
                2L, 1L,
                3L, 1L,
                4L, 1L);

        VoteResult result = gameLogicService.handleVotes(mockState, votes);
        assertFalse(result.isTie());
        assertFalse(result.isNobodyEliminated());
        assertEquals(1L, result.getEliminatedPlayerId());
        assertTrue(result.isGameOver());
        assertEquals("PAINTORS", result.getWinner());
    }

    @Test
    void testPlayerVotedOutBeingPaintor() {
        mockState.setImpostorId(2L);
        mockState.setCurrentRound(1);
        mockState.setAlivePlayerId(List.of(1L, 2L, 3L, 4L));

        Map<Long, Long> votes = Map.of(
                1L, 2L,
                2L, 1L,
                3L, 1L,
                4L, 1L);

        VoteResult result = gameLogicService.handleVotes(mockState, votes);
        assertFalse(result.isTie());
        assertFalse(result.isNobodyEliminated());
        assertEquals(1L, result.getEliminatedPlayerId());
        assertFalse(result.isGameOver());
    }

    @Test
    void testSelfVoteOnAbsence() {
        mockState.setCurrentRound(1);
        mockState.setImpostorId(99L);
        mockState.setAlivePlayerId(List.of(1L, 2L, 3L, 4L));

        Map<Long, Long> votes = new HashMap<>();
        votes.put(1L, 3L);
        votes.put(2L, 3L);
        votes.put(3L, 4L);

        VoteResult result = gameLogicService.handleVotes(mockState, votes);

        assertTrue(result.isNobodyEliminated());
        assertFalse(result.isTie());
        assertNull(result.getEliminatedPlayerId());
    }

    @Test
    void testRound2TieEmitsTieEvent() {
        mockState.setCurrentRound(2);
        mockState.setImpostorId(99L);
        mockState.setAlivePlayerId(List.of(1L, 2L, 3L, 4L));

        Map<Long, Long> votes = Map.of(
                1L, 1L,
                3L, 1L,
                2L, 2L,
                4L, 2L);

        VoteResult result = gameLogicService.handleVotes(mockState, votes);

        assertTrue(result.isTie());
        assertFalse(result.isNobodyEliminated());
        assertNull(result.getEliminatedPlayerId());
        assertEquals(2, result.getTiedPlayersId().size());
        assertTrue(result.getTiedPlayersId().containsAll(List.of(1L, 2L)));
    }

    @Test
    void testRound2MassiveTieWhenNobodyVotes() {
        mockState.setCurrentRound(2);
        mockState.setImpostorId(99L);
        mockState.setAlivePlayerId(List.of(1L, 2L, 3L, 4L));

        Map<Long, Long> emptyVotes = new HashMap<>();

        VoteResult result = gameLogicService.handleVotes(mockState, emptyVotes);

        assertTrue(result.isTie());
        assertNull(result.getEliminatedPlayerId());
        assertEquals(4, result.getTiedPlayersId().size());
        assertTrue(result.getTiedPlayersId().containsAll(List.of(1L, 2L, 3L, 4L)));
    }

    @Test
    void testTieBreakImpostorVotes() {
        mockState.setImpostorId(99L);

        Long impostorTargetId = 2L;

        VoteResult result = gameLogicService.handleTieBreak(mockState, impostorTargetId);

        assertFalse(result.isTie());
        assertFalse(result.isNobodyEliminated());
        assertEquals(2L, result.getEliminatedPlayerId());
        assertFalse(result.isGameOver());
    }

    @Test
    void testTieBreakImpostorInactivity() {
        mockState.setImpostorId(99L);

        Long impostorTargetId = null;

        VoteResult result = gameLogicService.handleTieBreak(mockState, impostorTargetId);

        assertFalse(result.isTie());
        assertEquals(99L, result.getEliminatedPlayerId());
        assertTrue(result.isGameOver());
        assertEquals("PAINTORS", result.getWinner());
    }

    @Test
    void testApplyEliminationAndAdvanceRound() {
        mockState.setCurrentRound(1);
        // Supongamos que quedan 4 jugadores (1, 2, 3, 4) y el impostor es el 99 (no
        // está en la lista de vivos por simplificar, o digamos que el 4 es el impostor)
        mockState.setImpostorId(4L);
        mockState.setAlivePlayerId(new java.util.ArrayList<>(java.util.List.of(1L, 2L, 3L, 4L))); // Lista mutable

        // Simulamos que la votación decidió echar al jugador 2 (un pintor)
        VoteResult resultFromVoting = VoteResult.builder()
                .nobodyEliminated(false)
                .eliminatedPlayerId(2L)
                .isGameOver(false)
                .build();

        gameLogicService.applyRoundResult(mockState, resultFromVoting);

        // El jugador 2 debe desaparecer de los vivos
        assertFalse(mockState.getAlivePlayerId().contains(2L));
        assertEquals(3, mockState.getAlivePlayerId().size());
        // La ronda debe avanzar a 2
        assertEquals(2, mockState.getCurrentRound());
    }

    @Test
    void testImpostorWinsIfOnlyOnePainterLeft() {
        mockState.setCurrentRound(3);
        mockState.setImpostorId(4L);
        // Quedan 3 jugadores.
        mockState.setAlivePlayerId(new java.util.ArrayList<>(java.util.List.of(1L, 3L, 4L)));

        // Se elimina al jugador 3
        VoteResult resultFromVoting = VoteResult.builder()
                .nobodyEliminated(false)
                .eliminatedPlayerId(3L)
                .isGameOver(false)
                .build();

        // Aplicamos el resultado
        VoteResult finalResult = gameLogicService.applyRoundResult(mockState, resultFromVoting);

        // Como solo quedan el 1 y el 4 (Pintor vs Impostor), el impostor gana
        // automáticamente
        assertTrue(finalResult.isGameOver());
        assertEquals("IMPAINTOR", finalResult.getWinner());
    }
}