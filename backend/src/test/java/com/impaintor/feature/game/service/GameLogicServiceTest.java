package com.impaintor.feature.game.service;

import com.impaintor.feature.game.models.GameState;
import com.impaintor.feature.game.models.GuessResult;
import com.impaintor.feature.game.models.VoteResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.util.Map;

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

        Map<Long, Long> votes = Map.of(
                1L, 1L,
                2L, 1L,
                3L, 1L,
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
        mockState.setAlivePlayerId(java.util.List.of(1L, 2L, 3L, 4L));

        java.util.Map<Long, Long> votes = new java.util.HashMap<>();
        votes.put(1L, 3L);
        votes.put(2L, 3L);
        votes.put(3L, 4L);
        votes.put(4L, 4L);

        VoteResult result = gameLogicService.handleVotes(mockState, votes);

        assertTrue(result.isNobodyEliminated());
        assertFalse(result.isTie());
        assertNull(result.getEliminatedPlayerId());
    }

}
